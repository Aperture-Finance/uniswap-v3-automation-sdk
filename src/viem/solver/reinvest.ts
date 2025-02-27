import {
  ApertureSupportedChainId,
  GAS_LIMIT_L2_MULTIPLIER,
  getAMMInfo,
  getChainInfo,
  getLogger,
} from '@/index';
import { IncreaseOptions } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { DEFAULT_SOLVERS, E_Solver, SwapRoute, getSolver } from '.';
import {
  FEE_ZAP_RATIO,
  IncreaseLiquidityParams,
  MAX_FEE_PIPS,
  estimateReinvestGas,
  estimateReinvestV3Gas,
  getAutomanReinvestCalldata,
  getFeeReinvestRatio,
  simulateReinvest,
  simulateReinvestV3,
} from '../automan';
import { PositionDetails } from '../position';
import { estimateTotalGasCostForOptimismLikeL2Tx } from '../public_client';
import {
  buildOptimalSolutions,
  calcPriceImpact,
  getOptimalSwapAmount,
  getOptimalSwapAmountV3,
  getSwapPath,
  getSwapRoute,
} from './internal';
import { SolverResult } from './types';

// Used for backend.
export async function reinvestBackend(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  fromAddress: Address,
  positionDetails: PositionDetails,
  increaseOptions: IncreaseOptions,
  tokenPricesUsd: [string, string],
  nativeToUsd: string, // Although SDK can compute using getTokenPriceFromCoingecko, extracting from backend cache is probably more efficient.
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  blockNumber?: bigint,
): Promise<SolverResult[]> {
  const tokenId = BigInt(increaseOptions.tokenId.toString());
  const increaseLiquidityParams: IncreaseLiquidityParams = {
    tokenId,
    amount0Desired: BigInt(positionDetails.tokensOwed0.quotient.toString()),
    amount1Desired: BigInt(positionDetails.tokensOwed1.quotient.toString()),
    amount0Min: 0n,
    amount1Min: 0n,
    deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
  };
  const token0 = positionDetails.pool.token0;
  const token1 = positionDetails.pool.token1;
  const { tickLower, tickUpper } = positionDetails;
  const feeOrTickSpacing =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? positionDetails.pool.tickSpacing
      : positionDetails.pool.fee;

  // Subtract fees from poolAmountIn before passing to solver
  // to prevent ERC20 Error: transfer amount exceeds balance.
  const { poolAmountIn, zeroForOne } = await getOptimalSwapAmount(
    chainId,
    amm,
    publicClient,
    token0.address as Address,
    token1.address as Address,
    feeOrTickSpacing,
    tickLower,
    tickUpper,
    increaseLiquidityParams.amount0Desired,
    increaseLiquidityParams.amount1Desired,
    blockNumber,
  );
  const swapFeeAmount = BigInt(
    new Big(poolAmountIn.toString()).mul(FEE_ZAP_RATIO).toFixed(0),
  );
  const feeReinvestRatio = getFeeReinvestRatio(feeOrTickSpacing);
  let token0FeeAmount =
    BigInt(
      new Big(increaseLiquidityParams.amount0Desired.toString())
        .mul(feeReinvestRatio)
        .toFixed(0),
    ) + (zeroForOne ? swapFeeAmount : 0n);
  let token1FeeAmount =
    BigInt(
      new Big(increaseLiquidityParams.amount1Desired.toString())
        .mul(feeReinvestRatio)
        .toFixed(0),
    ) + (zeroForOne ? 0n : swapFeeAmount);
  let swapAmountIn =
    poolAmountIn - (zeroForOne ? token0FeeAmount : token1FeeAmount);
  let feeUSD = new Big(token0FeeAmount.toString())
    .div(10 ** token0.decimals)
    .mul(tokenPricesUsd[0])
    .add(
      new Big(token1FeeAmount.toString())
        .div(10 ** token1.decimals)
        .mul(tokenPricesUsd[1]),
    );
  // Get position without feesCollected because that's how automanV1 uses feePips.
  const [token0Position, token1Position] = [
    new Big(positionDetails.position.amount0.quotient.toString()),
    new Big(positionDetails.position.amount1.quotient.toString()),
  ];
  const token0Usd = token0Position
    .mul(tokenPricesUsd[0])
    .div(10 ** positionDetails.token0.decimals);
  const token1Usd = token1Position
    .mul(tokenPricesUsd[1])
    .div(10 ** positionDetails.token1.decimals);
  const positionUsd = token0Usd.add(token1Usd);
  const positionRawNative = positionUsd
    .mul(10 ** getChainInfo(chainId).wrappedNativeCurrency.decimals)
    .div(nativeToUsd);
  const feeBips = BigInt(feeUSD.div(positionUsd).mul(MAX_FEE_PIPS).toFixed(0));

  getLogger().info('SDK.reinvestBackend.round1.fees ', {
    amm,
    chainId,
    tokenId,
    reinvestFeeUsd: feeUSD.toString(),
    token0PricesUsd: tokenPricesUsd[0],
    token1PricesUsd: tokenPricesUsd[1],
    nativeToUsd,
    token0FeeAmount,
    token1FeeAmount,
    amount0Desired: increaseLiquidityParams.amount0Desired,
    amount1Desired: increaseLiquidityParams.amount1Desired,
    zeroForOne,
    poolAmountIn, // before fees
    swapAmountIn, // after apertureFees, but before gasReimbursementFees
    positionUsd: positionUsd.toString(), // without feesCollected of the position
    positionRawNative: positionRawNative.toString(), // without feesCollected of the position
    feeBips,
  });

  const estimateGasInRawNaive = async (swapData: Hex) => {
    // Pass errors without (try-)catch, because failing to estimate gas will fail to reimburse relayer for gas.
    const [gasPriceInWei, gasUnits] = await Promise.all([
      publicClient.getGasPrice(),
      estimateReinvestGas(
        chainId,
        amm,
        publicClient,
        fromAddress,
        positionDetails.owner,
        increaseLiquidityParams,
        feeBips,
        swapData,
        blockNumber,
      ),
    ]);
    if (
      ![
        ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID,
        ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID,
        ApertureSupportedChainId.SCROLL_MAINNET_CHAIN_ID,
      ].includes(chainId)
    ) {
      return {
        gasUnits,
        gasInRawNative: gasPriceInWei * gasUnits,
      };
    }
    // Optimism-like chains (Optimism, Base, and Scroll) charge additional gas for rollup to L1, so we query the gas oracle contract to estimate the L1 gas cost in addition to the regular L2 gas cost.
    const estimatedTotalGas = await estimateTotalGasCostForOptimismLikeL2Tx(
      {
        from: fromAddress,
        to: getAMMInfo(chainId, amm)!.apertureAutoman,
        data: getAutomanReinvestCalldata(
          increaseLiquidityParams,
          feeBips,
          swapData,
          /* permitInfo= */ undefined,
        ),
      },
      chainId,
      publicClient,
    );
    // Scale the estimated gas by 1.5 as L1 gas could be at most 50% higher than the estimated gas.
    // We apply the scaling factor to the L2 gas portion as well because I find the estimated gas price is often lower than the actual price.
    // See https://community.optimism.io/docs/developers/build/transaction-fees/#the-l1-data-fee.
    return {
      gasUnits,
      gasInRawNative:
        (estimatedTotalGas.totalGasCost * BigInt(GAS_LIMIT_L2_MULTIPLIER)) /
        100n,
    };
  };

  const solve = async (solver: E_Solver) => {
    let swapData: Hex = '0x';
    let swapRoute: SwapRoute | undefined = undefined;
    let liquidity: bigint = 0n;
    let amount0: bigint = 0n;
    let amount1: bigint = 0n;
    let gasUnits: bigint = 0n;
    let gasInRawNative: bigint = 0n;

    try {
      const slippage =
        Number(increaseOptions.slippageTolerance.toSignificant()) / 100;
      if (swapAmountIn > 0n) {
        ({ swapData, swapRoute } = await getSolver(solver).solve({
          chainId,
          amm,
          fromAddress,
          token0: token0.address as Address,
          token1: token1.address as Address,
          feeOrTickSpacing,
          tickLower,
          tickUpper,
          slippage,
          poolAmountIn: swapAmountIn,
          zeroForOne,
        }));
      }
      ({ gasUnits, gasInRawNative } = await estimateGasInRawNaive(swapData));
      // Ethereum L1: 25% gas deduction boost.
      // L2s and all other L1s: 50% gas deduction boost.
      const gasBoostMultiplier =
        chainId === ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID
          ? 125
          : 150;
      const gasDeductionPips = BigInt(
        new Big(MAX_FEE_PIPS)
          .mul(gasBoostMultiplier)
          .div(100)
          .mul(gasInRawNative.toString())
          .div(positionRawNative)
          .toFixed(0),
      );
      const totalFeePips = feeBips + gasDeductionPips;
      token0FeeAmount = BigInt(
        token0Position
          .mul(totalFeePips.toString())
          .div(MAX_FEE_PIPS)
          .toFixed(0),
      );
      token1FeeAmount = BigInt(
        token1Position
          .mul(totalFeePips.toString())
          .div(MAX_FEE_PIPS)
          .toFixed(0),
      );
      swapAmountIn =
        poolAmountIn - (zeroForOne ? token0FeeAmount : token1FeeAmount);
      feeUSD = new Big(token0FeeAmount.toString())
        .div(10 ** token0.decimals)
        .mul(tokenPricesUsd[0])
        .add(
          new Big(token1FeeAmount.toString())
            .div(10 ** token1.decimals)
            .mul(tokenPricesUsd[1]),
        );

      getLogger().info('SDK.reinvestBackend.round2.fees ', {
        solver,
        amm,
        chainId,
        tokenId,
        totalReinvestFeeUsd: feeUSD.toString(),
        token0FeeAmount,
        token1FeeAmount,
        swapAmountIn, // after fees (both apertureFees and gasReimbursementFees)
        aptrFeeBips: feeBips,
        gasUnits,
        gasInRawNative,
        gasDeductionPips,
        totalFeePips,
      });

      if (swapAmountIn > 0n) {
        ({ swapData, swapRoute } = await getSolver(solver).solve({
          chainId,
          amm,
          fromAddress,
          token0: token0.address as Address,
          token1: token1.address as Address,
          feeOrTickSpacing,
          tickLower,
          tickUpper,
          slippage,
          poolAmountIn: swapAmountIn,
          zeroForOne,
        }));
      } else {
        swapData = '0x';
        swapRoute = undefined;
      }
      // Check fees offline to save a simulation request, because AutomanV1 will otherwise revert.
      if (token0FeeAmount > increaseLiquidityParams.amount0Desired) {
        throw new Error(
          `token0FeeAmount=${token0FeeAmount} > tokensOwed0=${increaseLiquidityParams.amount0Desired}`,
        );
      }
      if (token1FeeAmount > increaseLiquidityParams.amount1Desired) {
        throw new Error(
          `token1FeeAmount=${token1FeeAmount} > tokensOwed1=${increaseLiquidityParams.amount1Desired}`,
        );
      }
      [liquidity, amount0, amount1] = await simulateReinvest(
        chainId,
        amm,
        publicClient,
        fromAddress,
        positionDetails.owner,
        increaseLiquidityParams,
        totalFeePips,
        swapData,
        blockNumber,
      );

      const amount0OutAfterSlippage =
        (amount0 *
          BigInt(increaseOptions.slippageTolerance.numerator.toString())) /
        BigInt(increaseOptions.slippageTolerance.denominator.toString());
      const amount1OutAfterSlippage =
        (amount1 *
          BigInt(increaseOptions.slippageTolerance.numerator.toString())) /
        BigInt(increaseOptions.slippageTolerance.denominator.toString());

      return {
        solver,
        amount0: amount0OutAfterSlippage,
        amount1: amount1OutAfterSlippage,
        liquidity,
        swapData,
        gasUnits,
        gasFeeEstimation: gasInRawNative,
        swapRoute: getSwapRoute(
          token0.address as Address,
          token1.address as Address,
          amount0 - increaseLiquidityParams.amount0Desired,
          swapRoute,
        ),
        swapPath: getSwapPath(
          token0.address as Address,
          token1.address as Address,
          increaseLiquidityParams.amount0Desired,
          increaseLiquidityParams.amount1Desired,
          amount0,
          amount1,
          slippage,
        ),
        feeUSD: feeUSD.toFixed(),
        priceImpact: calcPriceImpact(
          positionDetails.pool,
          increaseLiquidityParams.amount0Desired,
          increaseLiquidityParams.amount1Desired,
          amount0,
          amount1,
        ),
        feeBips: totalFeePips,
        token0FeeAmount,
        token1FeeAmount,
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.reinvest.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        console.warn('SDK.Solver.reinvest.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}

// Used for frontend.
export async function reinvestV3(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  fromAddress: Address,
  positionDetails: PositionDetails,
  increaseOptions: IncreaseOptions,
  tokenPricesUsd: [string, string],
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  blockNumber?: bigint,
): Promise<SolverResult[]> {
  const tokenId = BigInt(increaseOptions.tokenId.toString());
  const increaseLiquidityParams: IncreaseLiquidityParams = {
    tokenId,
    amount0Desired: BigInt(positionDetails.tokensOwed0.quotient.toString()),
    amount1Desired: BigInt(positionDetails.tokensOwed1.quotient.toString()),
    amount0Min: 0n,
    amount1Min: 0n,
    deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
  };
  const token0 = positionDetails.pool.token0;
  const token1 = positionDetails.pool.token1;
  const { tickLower, tickUpper } = positionDetails;
  const feeOrTickSpacing =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? positionDetails.pool.tickSpacing
      : positionDetails.pool.fee;

  // Subtract fees from poolAmountIn before passing to solver
  // to prevent ERC20 Error: transfer amount exceeds balance.
  const { poolAmountIn, zeroForOne } = await getOptimalSwapAmountV3(
    chainId,
    amm,
    publicClient,
    token0.address as Address,
    token1.address as Address,
    feeOrTickSpacing,
    tickLower,
    tickUpper,
    increaseLiquidityParams.amount0Desired,
    increaseLiquidityParams.amount1Desired,
    blockNumber,
  );
  const swapFeeAmount = BigInt(
    new Big(poolAmountIn.toString()).mul(FEE_ZAP_RATIO).toFixed(0),
  );
  const feeReinvestRatio = getFeeReinvestRatio(feeOrTickSpacing);
  const token0FeeAmount =
    BigInt(
      new Big(increaseLiquidityParams.amount0Desired.toString())
        .mul(feeReinvestRatio)
        .toFixed(0),
    ) + (zeroForOne ? swapFeeAmount : 0n);
  const token1FeeAmount =
    BigInt(
      new Big(increaseLiquidityParams.amount1Desired.toString())
        .mul(feeReinvestRatio)
        .toFixed(0),
    ) + (zeroForOne ? 0n : swapFeeAmount);
  const swapAmountIn =
    poolAmountIn - (zeroForOne ? token0FeeAmount : token1FeeAmount);
  const feeUSD = new Big(token0FeeAmount.toString())
    .div(10 ** token0.decimals)
    .mul(tokenPricesUsd[0])
    .add(
      new Big(token1FeeAmount.toString())
        .div(10 ** token1.decimals)
        .mul(tokenPricesUsd[1]),
    );

  getLogger().info('SDK.reinvestV3.fees ', {
    amm,
    chainId,
    tokenId,
    totalReinvestFeeUsd: feeUSD.toString(),
    token0PricesUsd: tokenPricesUsd[0],
    token1PricesUsd: tokenPricesUsd[1],
    token0FeeAmount,
    token1FeeAmount,
    amount0Desired: increaseLiquidityParams.amount0Desired,
    amount1Desired: increaseLiquidityParams.amount1Desired,
    zeroForOne,
    poolAmountIn, // before fees
    swapAmountIn, // after fees
  });

  const estimateGas = async (swapData: Hex) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateReinvestV3Gas(
          chainId,
          amm,
          publicClient,
          fromAddress,
          positionDetails.owner,
          increaseLiquidityParams,
          token0FeeAmount,
          token1FeeAmount,
          swapData,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.reinvestV3.EstimateGas.Error', {
        error: JSON.stringify((e as Error).message),
        swapData,
        increaseLiquidityParams,
      });
      return 0n;
    }
  };

  const solve = async (solver: E_Solver) => {
    let swapData: Hex = '0x';
    let swapRoute: SwapRoute | undefined = undefined;
    let liquidity: bigint = 0n;
    let amount0: bigint = 0n;
    let amount1: bigint = 0n;
    let gasFeeEstimation: bigint = 0n;

    try {
      const slippage =
        Number(increaseOptions.slippageTolerance.toSignificant()) / 100;
      if (swapAmountIn > 0n) {
        ({ swapData, swapRoute } = await getSolver(solver).solve({
          chainId,
          amm,
          fromAddress,
          token0: token0.address as Address,
          token1: token1.address as Address,
          feeOrTickSpacing,
          tickLower,
          tickUpper,
          slippage,
          poolAmountIn: swapAmountIn,
          zeroForOne,
        }));
      }
      [liquidity, amount0, amount1] = await simulateReinvestV3(
        chainId,
        amm,
        publicClient,
        fromAddress,
        positionDetails.owner,
        increaseLiquidityParams,
        token0FeeAmount,
        token1FeeAmount,
        swapData,
        blockNumber,
      );
      gasFeeEstimation = await estimateGas(swapData);
      const amount0OutAfterSlippage =
        (amount0 *
          BigInt(increaseOptions.slippageTolerance.numerator.toString())) /
        BigInt(increaseOptions.slippageTolerance.denominator.toString());
      const amount1OutAfterSlippage =
        (amount1 *
          BigInt(increaseOptions.slippageTolerance.numerator.toString())) /
        BigInt(increaseOptions.slippageTolerance.denominator.toString());

      return {
        solver,
        amount0: amount0OutAfterSlippage,
        amount1: amount1OutAfterSlippage,
        liquidity,
        swapData,
        gasFeeEstimation,
        swapRoute: getSwapRoute(
          token0.address as Address,
          token1.address as Address,
          amount0 - increaseLiquidityParams.amount0Desired,
          swapRoute,
        ),
        swapPath: getSwapPath(
          token0.address as Address,
          token1.address as Address,
          increaseLiquidityParams.amount0Desired,
          increaseLiquidityParams.amount1Desired,
          amount0,
          amount1,
          slippage,
        ),
        feeUSD: feeUSD.toFixed(),
        priceImpact: calcPriceImpact(
          positionDetails.pool,
          increaseLiquidityParams.amount0Desired,
          increaseLiquidityParams.amount1Desired,
          amount0,
          amount1,
        ),
        token0FeeAmount,
        token1FeeAmount,
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.reinvestV3.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        console.warn('SDK.Solver.reinvestV3.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}
