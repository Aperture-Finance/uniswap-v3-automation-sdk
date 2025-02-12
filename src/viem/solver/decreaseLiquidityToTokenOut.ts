import { ApertureSupportedChainId, getLogger } from '@/index';
import { RemoveLiquidityOptions } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { DEFAULT_SOLVERS, E_Solver, SwapRoute, getSolver } from '.';
import {
  DecreaseLiquidityParams,
  FEE_ZAP_RATIO,
  estimateDecreaseLiquidityToTokenOutGas,
  simulateDecreaseLiquidity,
} from '../automan';
import { PositionDetails } from '../position';
import { getSwapRoute } from './internal';
import { SolverResult } from './types';

/**
 * Get the optimal amount of liquidity to decrease for a given pool and token amounts.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param publicClient Viem public client.
 * @param positionDetails Uniswap SDK PositionDetails for the specified position.
 * @param decreaseLiquidityOptions Decrease liquidity options.
 * @param zeroForOne If true, collect in token1. If false, collect in token0.
 * @param from The address to decrease liquidity for.
 * @param tokenPricesUsd The prices of the two tokens in the pool in usd.
 * @param blockNumber Optional. The block number to simulate the call from.
 * @param includeSolvers Optional. The solvers to include.
 */
export async function decreaseLiquidityToTokenOut(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
  from: Address,
  positionDetails: PositionDetails,
  decreaseLiquidityOptions: RemoveLiquidityOptions, // RemoveLiquidityOptions can be used for decreasing liquidity (<100%).
  tokenOut: Address,
  isUnwrapNative = true,
  tokenPricesUsd: [string, string],
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  blockNumber?: bigint,
  // Even though at most 1 result (which will be optimal), return an array for symmetry with other solver functions.
): Promise<SolverResult[]> {
  if (includeSolvers.length === 0) return [];
  // Use BigInt math for precision. liquidityToDecrease is not the liquidity from SolverResult, which is only used for comparing swapData.
  const liquidityToDecrease =
    (BigInt(positionDetails.liquidity.toString()) *
      BigInt(
        decreaseLiquidityOptions.liquidityPercentage.numerator.toString(),
      )) /
    BigInt(decreaseLiquidityOptions.liquidityPercentage.denominator.toString());
  const decreaseLiquidityParams: DecreaseLiquidityParams = {
    tokenId: BigInt(decreaseLiquidityOptions.tokenId.toString()),
    liquidity: liquidityToDecrease,
    amount0Min: 0n,
    amount1Min: 0n,
    deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
  };
  const token0 = positionDetails.token0;
  const token1 = positionDetails.token1;
  const feeOrTickSpacing =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? positionDetails.pool.tickSpacing
      : positionDetails.pool.fee;
  const [positionInitialAmount0, positionInitialAmount1] =
    await simulateDecreaseLiquidity(
      amm,
      chainId,
      publicClient,
      from,
      positionDetails.owner,
      decreaseLiquidityParams,
      /* token0FeeAmount= */ 0n,
      /* token1FeeAmount= */ 0n,
      isUnwrapNative,
      blockNumber,
    );
  const token0FeeAmount = BigInt(
    new Big(positionInitialAmount0.toString()).mul(FEE_ZAP_RATIO).toFixed(0),
  );
  const token1FeeAmount = BigInt(
    new Big(positionInitialAmount1.toString()).mul(FEE_ZAP_RATIO).toFixed(0),
  );
  // amountMins are used as feeAmounts due to stack too deep compiler error.
  decreaseLiquidityParams.amount0Min = token0FeeAmount;
  decreaseLiquidityParams.amount1Min = token1FeeAmount;
  const token0SwapIn = positionInitialAmount0 - token0FeeAmount;
  const token1SwapIn = positionInitialAmount1 - token1FeeAmount;

  const estimateGas = async (
    tokenOutMin: bigint,
    swapData0: Hex,
    swapData1: Hex,
  ) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateDecreaseLiquidityToTokenOutGas(
          amm,
          chainId,
          publicClient,
          from,
          positionDetails.owner,
          decreaseLiquidityParams,
          tokenOut,
          tokenOutMin,
          swapData0,
          swapData1,
          isUnwrapNative,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.decreaseLiquidityToTokenOut.EstimateGas.Error', {
        error: JSON.stringify((e as Error).message),
        decreaseLiquidityParams,
        swapData0,
        swapData1,
      });
      return 0n;
    }
  };

  let swapData: Hex = '0x';
  let swapData1: Hex = '0x';
  let swapRoute: SwapRoute | undefined = undefined;
  let swapRoute1: SwapRoute | undefined = undefined;
  let tokenOutFromToken0: bigint = 0n;
  let tokenOutFromToken1: bigint = 0n;
  let tokenOutAmount: bigint = 0n;
  let gasFeeEstimation: bigint = 0n;
  const [swap0Token0, swap0Token1, swap0deltaAmount0] =
    token0.address < tokenOut
      ? [token0.address as Address, tokenOut, -token0SwapIn]
      : [
          tokenOut,
          token0.address as Address,
          /* only sign matters */ token0SwapIn,
        ];
  const [swap1Token0, swap1Token1, swap1deltaAmount0] =
    token1.address < tokenOut
      ? [token1.address as Address, tokenOut, -token1SwapIn]
      : [
          tokenOut,
          token1.address as Address,
          /* only sign matters */ token1SwapIn,
        ];

  if (token0.address === tokenOut) {
    tokenOutFromToken0 = token0SwapIn;
  } else if (token0SwapIn > 0n) {
    const solverResults = await Promise.all(
      includeSolvers.map((solver) => {
        try {
          // Although it's mintOptimal, it's the same swapData and swapRoute.
          return getSolver(solver).mintOptimal({
            amm,
            chainId,
            fromAddress: from,
            token0: swap0Token0,
            token1: swap0Token1,
            feeOrTickSpacing,
            tickLower: positionDetails.tickLower,
            tickUpper: positionDetails.tickUpper,
            // Only apply slippage check to tokenOut, done in automan instead of solver.
            // Don't need slippage for a particular swap, because acceptable to swap less tokenA and more tokenB for tokenC.
            slippage: 1,
            poolAmountIn: token0SwapIn,
            zeroForOne: token0.address < tokenOut,
            isUseOptimalSwapRouter: false, // False because frontend uses the latest automan, which has the optimalSwapRouter merged into it.
          });
        } catch (e) {
          if (!(e as Error)?.message.startsWith('Expected')) {
            getLogger().error(
              'SDK.Solver.decreaseLiquidityToTokenOut.token0.Error',
              {
                solver,
                error: JSON.stringify((e as Error).message),
              },
            );
          } else {
            console.warn(
              'SDK.Solver.decreaseLiquidityToTokenOut.token0.Warning',
              solver,
            );
          }
          return null;
        }
      }),
    );
    for (const solverResult of solverResults) {
      if (solverResult != null && solverResult.toAmount > tokenOutFromToken0) {
        [tokenOutFromToken0, swapData, swapRoute] = [
          solverResult.toAmount,
          solverResult.swapData,
          solverResult.swapRoute,
        ];
      }
    }
  }
  if (token1.address === tokenOut) {
    tokenOutFromToken1 = token1SwapIn;
  } else if (token1SwapIn > 0n) {
    const solverResults = await Promise.all(
      includeSolvers.map((solver) => {
        try {
          // Although it's mintOptimal, it's the same swapData and swapRoute.
          return getSolver(solver).mintOptimal({
            amm,
            chainId,
            fromAddress: from,
            token0: swap1Token0,
            token1: swap1Token1,
            feeOrTickSpacing,
            tickLower: positionDetails.tickLower,
            tickUpper: positionDetails.tickUpper,
            // Only apply slippage check to tokenOut, done in automan instead of solver.
            // Don't need slippage for a particular swap, because acceptable to swap less tokenA and more tokenB for tokenC.
            slippage: 1,
            poolAmountIn: token1SwapIn,
            zeroForOne: token1.address < tokenOut,
            isUseOptimalSwapRouter: false, // False because frontend uses the latest automan, which has the optimalSwapRouter merged into it.
          });
        } catch (e) {
          if (!(e as Error)?.message.startsWith('Expected')) {
            getLogger().error(
              'SDK.Solver.decreaseLiquidityToTokenOut.token1.Error',
              {
                solver,
                error: JSON.stringify((e as Error).message),
              },
            );
          } else {
            console.warn(
              'SDK.Solver.decreaseLiquidityToTokenOut.token1.Warning',
              solver,
            );
          }
          return null;
        }
      }),
    );
    for (const solverResult of solverResults) {
      if (solverResult != null && solverResult.toAmount > tokenOutFromToken1) {
        [tokenOutFromToken1, swapData1, swapRoute1] = [
          solverResult.toAmount,
          solverResult.swapData,
          solverResult.swapRoute,
        ];
      }
    }
  }
  tokenOutAmount = tokenOutFromToken0 + tokenOutFromToken1;
  const tokenOutSlippage =
    (tokenOutAmount *
      BigInt(decreaseLiquidityOptions.slippageTolerance.numerator.toString())) /
    BigInt(decreaseLiquidityOptions.slippageTolerance.denominator.toString());
  const tokenOutAfterSlippage = tokenOutAmount - tokenOutSlippage;
  gasFeeEstimation = await estimateGas(
    tokenOutAfterSlippage,
    swapData,
    swapData1,
  );
  const feeUSD = Big(token0FeeAmount.toString())
    .div(10 ** token0.decimals)
    .mul(tokenPricesUsd[0])
    .add(
      Big(token1FeeAmount.toString())
        .div(10 ** token1.decimals)
        .mul(tokenPricesUsd[1]),
    );
  getLogger().info('SDK.decreaseLiquidityToTokenOut.fees ', {
    solvers: includeSolvers,
    amm: amm,
    chainId: chainId,
    position: decreaseLiquidityOptions.tokenId,
    totalDecreaseLiquidityToTokenOutFeeUsd: feeUSD.toString(),
    token0PricesUsd: tokenPricesUsd[0],
    token1PricesUsd: tokenPricesUsd[1],
    positionInitialAmount0,
    positionInitialAmount1,
    token0FeeAmount,
    token1FeeAmount,
    tokenOut,
    tokenOutAmount,
    tokenOutAfterSlippage,
    liquidityToDecrease,
    token0SwapIn,
    tokenOutFromToken0,
    token1SwapIn,
    tokenOutFromToken1,
  });

  return [
    {
      solver: includeSolvers[0], // All solvers are already compared, return 1st solver because it's required.
      amount0: token0SwapIn, // Not used
      amount1: token1SwapIn, // Not used
      liquidity: tokenOutAfterSlippage, // Required for SolverResult, used for tokenOutMin and can be used to compare solvers.
      swapData,
      swapData1,
      gasFeeEstimation,
      swapRoute: getSwapRoute(
        /* token0= */ swap0Token0,
        /* token1= */ swap0Token1,
        /* deltaAmount0= */ swap0deltaAmount0, // Actual amount doesn't matter, just whether it's positive or negative.
        swapRoute,
      ),
      swapRoute1: getSwapRoute(
        /* token0= */ swap1Token0,
        /* token1= */ swap1Token1,
        /* deltaAmount0= */ swap1deltaAmount0, // Actual amount doesn't matter, just whether it's positive or negative.
        swapRoute1,
      ),
      feeUSD: feeUSD.toFixed(),
      token0FeeAmount,
      token1FeeAmount,
    } as SolverResult,
  ];
}
