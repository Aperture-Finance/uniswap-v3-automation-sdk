import { ApertureSupportedChainId, getLogger } from '@/index';
import {
  Position,
  RemoveLiquidityOptions,
} from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { DEFAULT_SOLVERS, E_Solver, SwapRoute } from '.';
import {
  DecreaseLiquidityParams,
  FEE_ZAP_RATIO,
  estimateDecreaseLiquiditySingleV3Gas,
  simulateDecreaseLiquidity,
  simulateDecreaseLiquiditySingleV3,
} from '../automan';
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
 * @param position The current position to simulate the call from.
 * @param decreaseOptions Decrease liquidity options.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fromAddress The address to decrease liquidity from.
 * @param blockNumber Optional. The block number to simulate the call from.
 * @param includeSolvers Optional. The solvers to include.
 */
export async function decreaseLiquiditySingleV3(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  position: Position,
  decreaseOptions: RemoveLiquidityOptions, // RemoveLiquidityOptions can be used for decreasing liquidity (<100%).
  zeroForOne: boolean,
  from: Address,
  tokenPricesUsd: [string, string],
  blockNumber?: bigint,
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
): Promise<SolverResult[]> {
  const liquidityToDecrease = // not the liquidity in SolverResult
    BigInt(position.liquidity.toString()) *
    BigInt(decreaseOptions.liquidityPercentage.toSignificant());
  const decreaseLiquidityParams: DecreaseLiquidityParams = {
    tokenId: BigInt(decreaseOptions.tokenId.toString()),
    liquidity: liquidityToDecrease,
    amount0Min: 0n,
    amount1Min: 0n,
    deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
  };
  const token0 = position.pool.token0;
  const token1 = position.pool.token1;
  const [positionInitialAmount0, positionInitialAmount1] =
    await simulateDecreaseLiquidity(
      chainId,
      amm,
      publicClient,
      from,
      position,
      decreaseLiquidityParams,
      blockNumber,
    );
  const swapAmountIn = zeroForOne
    ? positionInitialAmount0
    : positionInitialAmount1;

  const estimateGas = async (swapData: Hex) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateDecreaseLiquiditySingleV3Gas(
          chainId,
          amm,
          publicClient,
          from,
          position,
          decreaseLiquidityParams,
          zeroForOne,
          swapData,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.decreaseLiquiditySingleV3.EstimateGas.Error', {
        error: JSON.stringify((e as Error).message),
        swapData,
        decreaseLiquidityParams,
      });
      return 0n;
    }
  };

  const solve = async (solver: E_Solver) => {
    const swapData: Hex = '0x';
    const swapRoute: SwapRoute | undefined = undefined;
    let amountOut: bigint = 0n;
    let gasFeeEstimation: bigint = 0n;

    try {
      const slippage =
        Number(decreaseOptions.slippageTolerance.toSignificant()) / 100;
      if (swapAmountIn > 0n) {
        amountOut = await simulateDecreaseLiquiditySingleV3(
          chainId,
          amm,
          publicClient,
          from,
          position,
          decreaseLiquidityParams,
          zeroForOne,
          swapData,
          blockNumber,
        );
        gasFeeEstimation = await estimateGas(swapData);
      }

      const token0FeeAmount = zeroForOne
        ? BigInt(new Big(swapAmountIn.toString()).mul(FEE_ZAP_RATIO).toFixed(0))
        : 0n;
      const token1FeeAmount = zeroForOne
        ? 0n
        : BigInt(
            new Big(swapAmountIn.toString()).mul(FEE_ZAP_RATIO).toFixed(0),
          );
      const tokenInPrice = zeroForOne ? tokenPricesUsd[0] : tokenPricesUsd[1];
      const decimals = zeroForOne ? token0.decimals : token1.decimals;
      const feeUSD = new Big(swapAmountIn.toString())
        .div(10 ** decimals)
        .mul(tokenInPrice)
        .mul(FEE_ZAP_RATIO);

      getLogger().info('SDK.decreaseLiquiditySingleV3.fees ', {
        amm: amm,
        chainId: chainId,
        position: decreaseOptions.tokenId,
        totalDecreaseLiquiditySingleFeeUsd: feeUSD.toString(),
        token0PricesUsd: tokenPricesUsd[0],
        token1PricesUsd: tokenPricesUsd[1],
        token0FeeAmount: token0FeeAmount.toString(),
        token1FeeAmount: token1FeeAmount.toString(),
        liquidityToDecrease: liquidityToDecrease.toString(),
        zeroForOne,
        swapAmountIn: swapAmountIn.toString(),
        amountOut: amountOut.toString(),
      });

      return {
        solver,
        amount0: zeroForOne ? 0n : amountOut,
        amount1: zeroForOne ? amountOut : 0n,
        liquidity: amountOut, // Required for SolverResult, can be used to compare solvers.
        swapData,
        gasFeeEstimation,
        swapRoute: getSwapRoute(
          token0.address as Address,
          token1.address as Address,
          /* deltaAmount0= */ zeroForOne
            ? swapAmountIn
            : amountOut - positionInitialAmount0,
          swapRoute,
        ),
        swapPath: getSwapPath(
          token0.address as Address,
          token1.address as Address,
          positionInitialAmount0,
          positionInitialAmount1,
          zeroForOne ? 0n : amountOut,
          zeroForOne ? amountOut : 0n,
          slippage,
        ),
        feeUSD: feeUSD.toFixed(),
        priceImpact: calcPriceImpact(
          position.pool,
          positionInitialAmount0,
          positionInitialAmount1,
          zeroForOne ? 0n : amountOut,
          zeroForOne ? amountOut : 0n,
        ),
        token0FeeAmount,
        token1FeeAmount,
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.decreaseLiquiditySingleV3.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        console.warn('SDK.Solver.decreaseLiquiditySingleV3.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}
