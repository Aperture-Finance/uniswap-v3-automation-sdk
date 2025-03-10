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
  estimateReinvestV4Gas,
  getAutomanReinvestCalldata,
  getFeeReinvestRatio,
  simulateReinvest,
  simulateReinvestV4,
} from '../automan';
import { PositionDetails } from '../position';
import { estimateTotalGasCostForOptimismLikeL2Tx } from '../public_client';
import {
  buildOptimalSolutions,
  getOptimalSwapAmount,
  getOptimalSwapAmountV4,
} from './internal';
import { SolverResult, SwapPath } from './types';

// Used for backend.
export async function reinvestBackend(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
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
    amount0Min: 0n, // 0 for simulation and estimating gas.
    amount1Min: 0n,
    deadline: BigInt(increaseOptions.deadline.toString()),
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
    token0PricesUsd: tokenPricesUsd[0],
    token1PricesUsd: tokenPricesUsd[1],
    nativeToUsd,
    includeSolvers,
    amount0Desired: increaseLiquidityParams.amount0Desired,
    amount1Desired: increaseLiquidityParams.amount1Desired,
    zeroForOne,
    poolAmountIn, // before fees
    swapAmountIn, // after apertureFees, but before gasReimbursementFees
    token0FeeAmount,
    token1FeeAmount,
    positionUsd: positionUsd.toString(), // without feesCollected of the position
    positionRawNative: positionRawNative.toString(), // without feesCollected of the position
    feeBips,
    feeUSD: feeUSD.toFixed(),
  });

  const estimateGasInRawNaive = async (swapData: Hex) => {
    // Pass errors without (try-)catch, because failing to estimate gas will fail to reimburse relayer for gas.
    const [gasPriceInWei, gasUnits] = await Promise.all([
      publicClient.getGasPrice(),
      estimateReinvestGas(
        chainId,
        amm,
        publicClient,
        from,
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
        from,
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
    let [swapData, swapPath, swapRoute, priceImpact]: [
      Hex,
      SwapPath | undefined,
      SwapRoute | undefined,
      string | undefined,
    ] = ['0x', undefined, undefined, undefined];
    let liquidity: bigint = 0n;
    let amount0: bigint = 0n;
    let amount1: bigint = 0n;
    let gasUnits: bigint = 0n;
    let gasInRawNative: bigint = 0n;

    try {
      const slippage = // numerator/denominator is more accurate than toSignificant()/100.
        Number(increaseOptions.slippageTolerance.numerator) /
        Number(increaseOptions.slippageTolerance.denominator);
      if (swapAmountIn > 0n) {
        ({ swapData, swapPath, swapRoute, priceImpact } = await getSolver(
          solver,
        ).solve({
          chainId,
          amm,
          from,
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

      getLogger().info('SDK.Solver.reinvestBackend.round2.fees ', {
        amm,
        chainId,
        tokenId,
        solver,
        gasUnits,
        gasInRawNative,
        gasDeductionPips, // just gasReimbursementFees
        feeBips, // just apertureFees
        totalFeePips,
        token0FeeAmount,
        token1FeeAmount,
        swapAmountIn, // after fees (both apertureFees and gasReimbursementFees)
        feeUSD: feeUSD.toFixed(),
      });

      if (swapAmountIn > 0n) {
        ({ swapData, swapPath, swapRoute, priceImpact } = await getSolver(
          solver,
        ).solve({
          chainId,
          amm,
          from,
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
        // Clear prior swap info if no swapAmountIn after accounting for gas reimbursements.
        [swapData, swapPath, swapRoute, priceImpact] = [
          '0x',
          undefined,
          undefined,
          undefined,
        ];
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
        from,
        positionDetails.owner,
        increaseLiquidityParams,
        totalFeePips,
        swapData,
        blockNumber,
      );

      return {
        solver,
        amount0,
        amount1,
        liquidity,
        gasUnits,
        gasFeeEstimation: gasInRawNative,
        token0FeeAmount,
        token1FeeAmount,
        feeUSD: feeUSD.toFixed(),
        feeBips: totalFeePips,
        swapData,
        swapPath,
        swapRoute,
        priceImpact,
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.reinvestBackend.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        getLogger().warn('SDK.Solver.reinvestBackend.Warn', {
          solver,
          warn: JSON.stringify((e as Error).message),
        });
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}

// Used for frontend.
export async function reinvestV4(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
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
    amount0Min: 0n, // 0 for simulation and estimating gas.
    amount1Min: 0n,
    deadline: BigInt(increaseOptions.deadline.toString()),
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
  const { poolAmountIn, zeroForOne } = await getOptimalSwapAmountV4(
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

  getLogger().info('SDK.reinvestV4.fees ', {
    amm,
    chainId,
    tokenId,
    token0PricesUsd: tokenPricesUsd[0],
    token1PricesUsd: tokenPricesUsd[1],
    includeSolvers,
    amount0Desired: increaseLiquidityParams.amount0Desired,
    amount1Desired: increaseLiquidityParams.amount1Desired,
    zeroForOne,
    poolAmountIn, // before fees
    swapAmountIn, // after fees
    token0FeeAmount,
    token1FeeAmount,
    feeUSD: feeUSD.toFixed(),
  });

  const estimateGas = async (swapData: Hex) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateReinvestV4Gas(
          chainId,
          amm,
          publicClient,
          from,
          positionDetails.owner,
          increaseLiquidityParams,
          token0FeeAmount,
          token1FeeAmount,
          swapData,
          blockNumber,
        ),
      ]);
      return BigInt(gasPrice * gasAmount);
    } catch (e) {
      getLogger().error('SDK.reinvestV4.EstimateGas.Error', {
        error: JSON.stringify((e as Error).message),
        swapData,
        increaseLiquidityParams,
      });
      return 0n;
    }
  };

  const solve = async (solver: E_Solver) => {
    let [swapData, swapPath, swapRoute, priceImpact]: [
      Hex,
      SwapPath | undefined,
      SwapRoute | undefined,
      string | undefined,
    ] = ['0x', undefined, undefined, undefined];
    let liquidity: bigint = 0n;
    let amount0: bigint = 0n;
    let amount1: bigint = 0n;
    let gasFeeEstimation: bigint = 0n;

    try {
      const slippage = // numerator/denominator is more accurate than toSignificant()/100.
        Number(increaseOptions.slippageTolerance.numerator) /
        Number(increaseOptions.slippageTolerance.denominator);
      if (swapAmountIn > 0n) {
        ({ swapData, swapPath, swapRoute, priceImpact } = await getSolver(
          solver,
        ).solve({
          chainId,
          amm,
          from,
          token0: token0.address as Address,
          token1: token1.address as Address,
          feeOrTickSpacing,
          tickLower,
          tickUpper,
          slippage,
          poolAmountIn: swapAmountIn,
          zeroForOne,
          isUseOptimalSwapRouter: false, // False because frontend uses the latest automan, which has the optimalSwapRouter merged into it.
        }));
      }
      [liquidity, amount0, amount1] = await simulateReinvestV4(
        chainId,
        amm,
        publicClient,
        from,
        positionDetails.owner,
        increaseLiquidityParams,
        token0FeeAmount,
        token1FeeAmount,
        swapData,
        blockNumber,
      );
      gasFeeEstimation = await estimateGas(swapData);

      return {
        solver,
        amount0,
        amount1,
        liquidity,
        gasFeeEstimation,
        feeUSD: feeUSD.toFixed(),
        token0FeeAmount,
        token1FeeAmount,
        swapData,
        swapPath,
        swapRoute,
        priceImpact,
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.reinvestV4.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        getLogger().warn('SDK.Solver.reinvestV4.Warn', {
          solver,
          warn: JSON.stringify((e as Error).message),
        });
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}
