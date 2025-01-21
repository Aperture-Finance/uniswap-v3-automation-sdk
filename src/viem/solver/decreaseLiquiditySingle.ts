import { ApertureSupportedChainId, getLogger } from '@/index';
import { RemoveLiquidityOptions } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { DEFAULT_SOLVERS, E_Solver, SwapRoute, getSolver } from '.';
import {
  DecreaseLiquidityParams,
  FEE_ZAP_RATIO,
  estimateDecreaseLiquiditySingleGas,
  simulateDecreaseLiquidity,
  simulateDecreaseLiquiditySingle,
} from '../automan';
import { PositionDetails } from '../position';
import {
  buildOptimalSolutions,
  calcPriceImpact,
  getSwapPath,
  getSwapRoute,
} from './internal';
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
export async function decreaseLiquiditySingle(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  positionDetails: PositionDetails,
  decreaseLiquidityOptions: RemoveLiquidityOptions, // RemoveLiquidityOptions can be used for decreasing liquidity (<100%).
  zeroForOne: boolean,
  from: Address,
  tokenPricesUsd: [string, string],
  isUnwrapNative = true,
  blockNumber?: bigint,
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
): Promise<SolverResult[]> {
  // Use BigInt math for precision, not the liquidity in SolverResult
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
    deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
  };
  const token0 = positionDetails.token0;
  const token1 = positionDetails.token1;
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
  let swapAmountIn = zeroForOne
    ? positionInitialAmount0
    : positionInitialAmount1;
  const swapFeeAmount = BigInt(
    new Big(swapAmountIn.toString()).mul(FEE_ZAP_RATIO).toFixed(0),
  );
  swapAmountIn -= swapFeeAmount;
  const token0FeeAmount = zeroForOne ? swapFeeAmount : 0n;
  const token1FeeAmount = zeroForOne ? 0n : swapFeeAmount;

  const estimateGas = async (swapData: Hex) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateDecreaseLiquiditySingleGas(
          chainId,
          amm,
          publicClient,
          from,
          positionDetails.owner,
          decreaseLiquidityParams,
          zeroForOne,
          token0FeeAmount,
          token1FeeAmount,
          swapData,
          isUnwrapNative,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.decreaseLiquiditySingleV4.EstimateGas.Error', {
        error: JSON.stringify((e as Error).message),
        swapData,
        decreaseLiquidityParams,
      });
      return 0n;
    }
  };

  const solve = async (solver: E_Solver) => {
    let swapData: Hex = '0x';
    let swapRoute: SwapRoute | undefined = undefined;
    let amountOut: bigint = 0n;
    let gasFeeEstimation: bigint = 0n;

    try {
      const slippage =
        Number(decreaseLiquidityOptions.slippageTolerance.toSignificant()) /
        100;
      if (swapAmountIn > 0n) {
        // Although it's mintOptimal, it's the same swapData and swapRoute.
        ({ swapData, swapRoute } = await getSolver(solver).mintOptimal({
          chainId,
          amm,
          fromAddress: from,
          token0: token0.address as Address,
          token1: token1.address as Address,
          feeOrTickSpacing:
            amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
              ? positionDetails.tickSpacing
              : positionDetails.fee,
          tickLower: positionDetails.tickLower,
          tickUpper: positionDetails.tickUpper,
          slippage,
          poolAmountIn: swapAmountIn,
          zeroForOne,
          isUseOptimalSwapRouter: false, // False because frontend uses the latest automan, which has the optimalSwapRouter merged into it.
        }));
        amountOut = await simulateDecreaseLiquiditySingle(
          chainId,
          amm,
          publicClient,
          from,
          positionDetails.owner,
          decreaseLiquidityParams,
          zeroForOne,
          token0FeeAmount,
          token1FeeAmount,
          swapData,
          isUnwrapNative,
          blockNumber,
        );
        gasFeeEstimation = await estimateGas(swapData);
      }

      const tokenInPrice = zeroForOne ? tokenPricesUsd[0] : tokenPricesUsd[1];
      const decimals = zeroForOne ? token0.decimals : token1.decimals;
      const feeUSD = new Big(swapAmountIn.toString())
        .div(10 ** decimals)
        .mul(tokenInPrice)
        .mul(FEE_ZAP_RATIO);
      const tokenOutSlippage =
        (amountOut *
          BigInt(
            decreaseLiquidityOptions.slippageTolerance.numerator.toString(),
          )) /
        BigInt(
          decreaseLiquidityOptions.slippageTolerance.denominator.toString(),
        );
      // Based on current automan contracts, fees are in swapInputToken whereas slippage are in swapOutputToken.
      const token0Out = zeroForOne ? 0n : amountOut;
      const token1Out = zeroForOne ? amountOut : 0n;
      const token0OutAfterSlippage = zeroForOne
        ? 0n
        : amountOut - tokenOutSlippage;
      const token1OutAfterSlippage = zeroForOne
        ? amountOut - tokenOutSlippage
        : 0n;
      getLogger().info('SDK.decreaseLiquiditySingleV4.fees ', {
        solver: solver,
        amm: amm,
        chainId: chainId,
        position: decreaseLiquidityOptions.tokenId,
        totalDecreaseLiquiditySingleFeeUsd: feeUSD.toString(),
        token0PricesUsd: tokenPricesUsd[0],
        token1PricesUsd: tokenPricesUsd[1],
        token0FeeAmount: token0FeeAmount.toString(),
        token1FeeAmount: token1FeeAmount.toString(),
        token0OutAfterSlippage: token0OutAfterSlippage.toString(),
        token1OutAfterSlippage: token1OutAfterSlippage.toString(),
        liquidityToDecrease: liquidityToDecrease.toString(),
        zeroForOne,
        swapAmountIn: swapAmountIn.toString(),
        amountOut: amountOut.toString(),
      });

      return {
        solver,
        amount0: token0OutAfterSlippage, // Used for amount0Min
        amount1: token1OutAfterSlippage, // Used for amount1Min
        liquidity: amountOut, // Required for SolverResult, can be used to compare solvers.
        swapData,
        gasFeeEstimation,
        swapRoute: getSwapRoute(
          token0.address as Address,
          token1.address as Address,
          /* deltaAmount0= */ token0Out - positionInitialAmount0, // Actual amount doesn't matter, just whether it's positive or negative.
          swapRoute,
        ),
        swapPath: getSwapPath(
          token0.address as Address,
          token1.address as Address,
          positionInitialAmount0,
          positionInitialAmount1,
          token0Out,
          token1Out,
          slippage,
        ),
        feeUSD: feeUSD.toFixed(),
        priceImpact: calcPriceImpact(
          positionDetails.pool,
          positionInitialAmount0,
          positionInitialAmount1,
          token0Out,
          token1Out,
        ),
        token0FeeAmount,
        token1FeeAmount,
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.decreaseLiquiditySingle.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        console.warn('SDK.Solver.decreaseLiquiditySingle.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}
