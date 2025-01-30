import { getAmountsForLiquidity } from '@/helper';
import { ApertureSupportedChainId, getLogger } from '@/index';
import { IncreaseOptions, TickMath } from '@aperture_finance/uniswap-v3-sdk';
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
  getFeeReinvestRatio,
  simulateReinvest,
  simulateReinvestV3,
} from '../automan';
import { PositionDetails } from '../position';
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
export async function reinvest(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  positionDetails: PositionDetails,
  increaseOptions: IncreaseOptions,
  fromAddress: Address,
  tokenPricesUsd: [string, string],
  blockNumber?: bigint,
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
): Promise<SolverResult[]> {
  const increaseParams: IncreaseLiquidityParams = {
    tokenId: BigInt(increaseOptions.tokenId.toString()),
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
    increaseParams.amount0Desired,
    increaseParams.amount1Desired,
    blockNumber,
  );
  const swapFeeAmount = BigInt(
    new Big(poolAmountIn.toString()).mul(FEE_ZAP_RATIO).toFixed(0),
  );
  const feeReinvestRatio = getFeeReinvestRatio(feeOrTickSpacing);
  const token0FeeAmount =
    BigInt(
      new Big(increaseParams.amount0Desired.toString())
        .mul(feeReinvestRatio)
        .toFixed(0),
    ) + (zeroForOne ? swapFeeAmount : 0n);
  const token1FeeAmount =
    BigInt(
      new Big(increaseParams.amount1Desired.toString())
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
  // Get position without feesCollected because that's how automanV1 uses feePips.
  const [token0Position, token1Position] = getAmountsForLiquidity(
    /* sqrtRatioX96= */ Big(positionDetails.pool.sqrtRatioX96.toString()),
    /* sqrtRatioAX96= */ Big(TickMath.getSqrtRatioAtTick(tickLower).toString()),
    /* sqrtRatioBX96= */ Big(TickMath.getSqrtRatioAtTick(tickUpper).toString()),
    /* liquidity= */ Big(positionDetails.liquidity),
  );
  const token0Usd = new Big(token0Position)
    .mul(tokenPricesUsd[0])
    .div(10 ** positionDetails.token0.decimals);
  const token1Usd = new Big(token1Position)
    .mul(tokenPricesUsd[1])
    .div(10 ** positionDetails.token1.decimals);
  const positionUsd = token0Usd.add(token1Usd);
  const feeBips = BigInt(feeUSD.div(positionUsd).mul(MAX_FEE_PIPS).toFixed(0));

  getLogger().info('SDK.reinvest.fees ', {
    amm,
    chainId,
    nftId: increaseOptions.tokenId,
    totalReinvestFeeUsd: feeUSD.toString(),
    token0PricesUsd: tokenPricesUsd[0],
    token1PricesUsd: tokenPricesUsd[1],
    token0FeeAmount: token0FeeAmount.toString(),
    token1FeeAmount: token1FeeAmount.toString(),
    amount0Desired: increaseParams.amount0Desired.toString(),
    amount1Desired: increaseParams.amount1Desired.toString(),
    zeroForOne,
    poolAmountIn: poolAmountIn.toString(), // before fees
    swapAmountIn: swapAmountIn.toString(), // after fees
    positionUsd: positionUsd.toString(), // without feesCollected of the position
    feeBips: feeBips.toString(),
  });

  const estimateGas = async (swapData: Hex) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateReinvestGas(
          chainId,
          amm,
          publicClient,
          fromAddress,
          positionDetails.owner,
          increaseParams,
          feeBips,
          swapData,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.reinvest.EstimateGas.Error', {
        error: JSON.stringify((e as Error).message),
        swapData,
        increaseParams,
      });
      return 0n;
    }
  };

  const solve = async (solver: E_Solver) => {
    let swapData: Hex = '0x';
    let swapRoute: SwapRoute | undefined = undefined;
    let liquidity: bigint = 0n;
    let amount0: bigint = increaseParams.amount0Desired;
    let amount1: bigint = increaseParams.amount1Desired;
    let gasFeeEstimation: bigint = 0n;

    try {
      const slippage =
        Number(increaseOptions.slippageTolerance.toSignificant()) / 100;
      if (swapAmountIn > 0n) {
        ({ swapData, swapRoute } = await getSolver(solver).mintOptimal({
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
      [liquidity, amount0, amount1] = await simulateReinvest(
        chainId,
        amm,
        publicClient,
        fromAddress,
        positionDetails.owner,
        increaseParams,
        feeBips,
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
          amount0 - increaseParams.amount0Desired,
          swapRoute,
        ),
        swapPath: getSwapPath(
          token0.address as Address,
          token1.address as Address,
          increaseParams.amount0Desired,
          increaseParams.amount1Desired,
          amount0,
          amount1,
          slippage,
        ),
        feeUSD: feeUSD.toFixed(),
        priceImpact: calcPriceImpact(
          positionDetails.pool,
          increaseParams.amount0Desired,
          increaseParams.amount1Desired,
          amount0,
          amount1,
        ),
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
  positionDetails: PositionDetails,
  increaseOptions: IncreaseOptions,
  fromAddress: Address,
  tokenPricesUsd: [string, string],
  blockNumber?: bigint,
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
): Promise<SolverResult[]> {
  const increaseParams: IncreaseLiquidityParams = {
    tokenId: BigInt(increaseOptions.tokenId.toString()),
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
    increaseParams.amount0Desired,
    increaseParams.amount1Desired,
    blockNumber,
  );
  const swapFeeAmount = BigInt(
    new Big(poolAmountIn.toString()).mul(FEE_ZAP_RATIO).toFixed(0),
  );
  const feeReinvestRatio = getFeeReinvestRatio(feeOrTickSpacing);
  const token0FeeAmount =
    BigInt(
      new Big(increaseParams.amount0Desired.toString())
        .mul(feeReinvestRatio)
        .toFixed(0),
    ) + (zeroForOne ? swapFeeAmount : 0n);
  const token1FeeAmount =
    BigInt(
      new Big(increaseParams.amount1Desired.toString())
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
    nftId: increaseOptions.tokenId,
    totalReinvestFeeUsd: feeUSD.toString(),
    token0PricesUsd: tokenPricesUsd[0],
    token1PricesUsd: tokenPricesUsd[1],
    token0FeeAmount: token0FeeAmount.toString(),
    token1FeeAmount: token1FeeAmount.toString(),
    amount0Desired: increaseParams.amount0Desired.toString(),
    amount1Desired: increaseParams.amount1Desired.toString(),
    zeroForOne,
    poolAmountIn: poolAmountIn.toString(), // before fees
    swapAmountIn: swapAmountIn.toString(), // after fees
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
          increaseParams,
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
        increaseParams,
      });
      return 0n;
    }
  };

  const solve = async (solver: E_Solver) => {
    let swapData: Hex = '0x';
    let swapRoute: SwapRoute | undefined = undefined;
    let liquidity: bigint = 0n;
    let amount0: bigint = increaseParams.amount0Desired;
    let amount1: bigint = increaseParams.amount1Desired;
    let gasFeeEstimation: bigint = 0n;

    try {
      const slippage =
        Number(increaseOptions.slippageTolerance.toSignificant()) / 100;
      if (swapAmountIn > 0n) {
        ({ swapData, swapRoute } = await getSolver(solver).mintOptimal({
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
        increaseParams,
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
          amount0 - increaseParams.amount0Desired,
          swapRoute,
        ),
        swapPath: getSwapPath(
          token0.address as Address,
          token1.address as Address,
          increaseParams.amount0Desired,
          increaseParams.amount1Desired,
          amount0,
          amount1,
          slippage,
        ),
        feeUSD: feeUSD.toFixed(),
        priceImpact: calcPriceImpact(
          positionDetails.pool,
          increaseParams.amount0Desired,
          increaseParams.amount1Desired,
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
