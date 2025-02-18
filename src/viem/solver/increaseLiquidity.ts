import { ApertureSupportedChainId, getLogger } from '@/index';
import { IncreaseOptions, Position } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { DEFAULT_SOLVERS, E_Solver, SwapRoute, getSolver } from '.';
import {
  FEE_ZAP_RATIO,
  IncreaseLiquidityParams,
  estimateIncreaseLiquidityOptimalV4Gas,
  simulateIncreaseLiquidityOptimalV4,
} from '../automan';
import {
  buildOptimalSolutions,
  calcPriceImpact,
  getOptimalSwapAmountV4,
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
 * @param from The address to increase liquidity from.
 * @param tokenPricesUsd The token prices in USD.
 * @param blockNumber Optional. The block number to simulate the call from.
 * @param includeSolvers Optional. The solvers to include.
 */
export async function increaseLiquidityOptimalV4(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  position: Position,
  increaseOptions: IncreaseOptions,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  from: Address,
  tokenPricesUsd: [string, string],
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  blockNumber?: bigint,
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
    deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
  };

  const token0 = position.pool.token0.address as Address;
  const token1 = position.pool.token1.address as Address;
  const { tickLower, tickUpper } = position;
  const feeOrTickSpacing =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? position.pool.tickSpacing
      : position.pool.fee;

  // Subtract fees from poolAmountIn before passing to solver
  // to prevent ERC20 Error: transfer amount exceeds balance.
  const { poolAmountIn, zeroForOne } = await getOptimalSwapAmountV4(
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
  const swapFeeAmount = BigInt(
    new Big(poolAmountIn.toString()).mul(FEE_ZAP_RATIO).toFixed(0),
  );
  const swapAmountIn = poolAmountIn - swapFeeAmount;
  const token0FeeAmount = zeroForOne ? swapFeeAmount : 0n;
  const token1FeeAmount = zeroForOne ? 0n : swapFeeAmount;
  const tokenInPrice = zeroForOne ? tokenPricesUsd[0] : tokenPricesUsd[1];
  const tokenInDecimals = zeroForOne
    ? token0Amount.currency.decimals
    : token1Amount.currency.decimals;
  const feeUSD = new Big(swapFeeAmount.toString())
    .div(10 ** tokenInDecimals)
    .mul(tokenInPrice);
  // No need to subtract fees from increaseParams.amount0Desired
  // and increaseParams.amount1Desired because that's done in automan.
  getLogger().info('SDK.increaseLiquidityOptimalV4.fees ', {
    amm,
    chainId,
    nftId: increaseOptions.tokenId,
    feeUSD: feeUSD.toString(),
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
        estimateIncreaseLiquidityOptimalV4Gas(
          chainId,
          amm,
          publicClient,
          from,
          position,
          increaseParams,
          swapData,
          token0FeeAmount,
          token1FeeAmount,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.increaseLiquidityOptimalV4.EstimateGas.Error', {
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
      const slippage = // numerator/denominator is more accurate than toSignificant()/100.
        Number(increaseOptions.slippageTolerance.numerator) /
        Number(increaseOptions.slippageTolerance.denominator);
      if (swapAmountIn > 0n) {
        ({ swapData, swapRoute } = await getSolver(solver).mintOptimal({
          chainId,
          amm,
          from,
          token0,
          token1,
          feeOrTickSpacing,
          tickLower,
          tickUpper,
          slippage,
          poolAmountIn: swapAmountIn,
          zeroForOne,
          isUseOptimalSwapRouter: false, // False because frontend uses the latest automan, which has the optimalSwapRouter merged into it.
        }));
      }
      [liquidity, amount0, amount1] = await simulateIncreaseLiquidityOptimalV4(
        chainId,
        amm,
        publicClient,
        from,
        position,
        increaseParams,
        swapData,
        token0FeeAmount,
        token1FeeAmount,
        blockNumber,
      );
      gasFeeEstimation = await estimateGas(swapData);

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
        feeUSD: feeUSD.toFixed(),
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
        getLogger().error('SDK.Solver.increaseLiquidityOptimalV4.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        getLogger().warn('SDK.Solver.increaseLiquidityOptimalV4.Warn', {
          solver,
          warn: JSON.stringify((e as Error).message),
        });
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}
