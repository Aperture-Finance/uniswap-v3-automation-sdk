import { ApertureSupportedChainId, getLogger } from '@/index';
import { IncreaseOptions, Position } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, PublicClient } from 'viem';

import { ALL_SOLVERS, E_Solver, getSolver } from '.';
import {
  FEE_ZAP_RATIO,
  IncreaseLiquidityParams,
  estimateIncreaseLiquidityOptimalGas,
  simulateIncreaseLiquidityOptimal,
} from '../automan';
import {
  buildOptimalSolutions,
  calcPriceImpact,
  getOptimalSwapAmount,
  getSwapPath,
  getSwapRoute,
} from './internal';
import { SolverResult } from './types';

/**
 * Get the optimal amount of liquidity to increase for a given pool and token amounts.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param publicClient Viem public client.
 * @param position The current position to simulate the call from.
 * @param increaseOptions Increase liquidity options.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fromAddress The address to increase liquidity from.
 * @param blockNumber Optional. The block number to simulate the call from.
 * @param includeSolvers Optional. The solvers to include.
 */
export async function increaseLiquidityOptimalV2Fees(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  position: Position,
  increaseOptions: IncreaseOptions,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  fromAddress: Address,
  blockNumber?: bigint,
  includeSolvers: E_Solver[] = ALL_SOLVERS,
): Promise<SolverResult[]> {
  if (!token0Amount.currency.sortsBefore(token1Amount.currency)) {
    throw new Error('token0 must be sorted before token1');
  }

  const increaseParams: IncreaseLiquidityParams = {
    tokenId: BigInt(increaseOptions.tokenId.toString()),
    amount0Desired: BigInt(token0Amount.quotient.toString()),
    amount1Desired: BigInt(token1Amount.quotient.toString()),
    amount0Min: 0n,
    amount1Min: 0n,
    deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
  };

  const token0 = position.pool.token0.address as Address;
  const token1 = position.pool.token1.address as Address;
  const { tickLower, tickUpper } = position;
  const feeOrTickSpacing =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? position.pool.tickSpacing
      : position.pool.fee;

  const { poolAmountIn, zeroForOne } = await getOptimalSwapAmount(
    chainId,
    amm,
    publicClient,
    token0,
    token1,
    feeOrTickSpacing,
    tickLower,
    tickUpper,
    increaseParams.amount0Desired,
    increaseParams.amount1Desired,
    blockNumber,
  );

  const solve = async (solver: E_Solver) => {
    try {
      const slippage =
        Number(increaseOptions.slippageTolerance.toSignificant()) / 100;
      const { swapData, swapRoute } = await getSolver(solver).optimalMint({
        chainId,
        amm,
        fromAddress,
        token0,
        token1,
        feeOrTickSpacing,
        tickLower,
        tickUpper,
        slippage,
        poolAmountIn,
        zeroForOne,
      });
      const [liquidity, amount0, amount1] =
        await simulateIncreaseLiquidityOptimal(
          chainId,
          amm,
          publicClient,
          fromAddress,
          position,
          increaseParams,
          swapData,
          blockNumber,
        );

      let gasFeeEstimation = 0n;
      try {
        const [gasPrice, gasAmount] = await Promise.all([
          publicClient.getGasPrice(),
          estimateIncreaseLiquidityOptimalGas(
            chainId,
            amm,
            publicClient,
            fromAddress,
            position,
            increaseParams,
            swapData,
            blockNumber,
          ),
        ]);
        gasFeeEstimation = gasPrice * gasAmount;
      } catch (e) {
        getLogger().error('SDK.increaseLiquidityOptimalV2.EstimateGas.Error', {
          error: JSON.stringify((e as Error).message),
          swapData,
          increaseParams,
        });
      }

      const token0FeeAmount = zeroForOne
        ? new Big(poolAmountIn.toString()).mul(FEE_ZAP_RATIO)
        : 0n;
      const token1FeeAmount = zeroForOne
        ? 0n
        : new Big(poolAmountIn.toString()).mul(FEE_ZAP_RATIO);

      getLogger().info('increaseLiquidityOptimalV2Fees ', {
        amm: amm,
        chainId: chainId,
        position: increaseOptions.tokenId,
        token0FeeAmount: token0FeeAmount.toString(),
        token1FeeAmount: token1FeeAmount.toString(),
        amount0Desired: increaseParams.amount0Desired.toString(),
        amount1Desired: increaseParams.amount1Desired.toString(),
        zeroForOne,
        poolAmountIn: poolAmountIn.toString(),
      });

      return {
        solver,
        amount0,
        amount1,
        liquidity,
        swapData,
        gasFeeEstimation,
        swapRoute: getSwapRoute(
          token0,
          token1,
          amount0 - increaseParams.amount0Desired,
          swapRoute,
        ),
        swapPath: getSwapPath(
          token0,
          token1,
          increaseParams.amount0Desired,
          increaseParams.amount1Desired,
          amount0,
          amount1,
          slippage,
        ),
        priceImpact: calcPriceImpact(
          position.pool,
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
        getLogger().error('SDK.Solver.increaseLiquidityOptimalV2.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        console.warn('SDK.Solver.increaseLiquidityOptimalV2.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}
