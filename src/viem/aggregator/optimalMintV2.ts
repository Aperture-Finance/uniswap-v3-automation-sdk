import { ApertureSupportedChainId } from '@/index';
import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

import { MintParams, simulateMintOptimal } from '../automan';
import { getPool } from '../pool';
import { ALL_SOLVERS, E_Solver, getSolver } from '../solver';
import {
  buildOptimalSolutions,
  calcPriceImpact,
  getOptimalSwapAmount,
  getSwapPath,
  getSwapRoute,
} from './internal';
import { SolverResult } from './types';

/**
 * Get the optimal amount of liquidity to mint for a given pool and token amounts.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fee The pool fee tier.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param fromAddress The address to mint from.
 * @param slippage The slippage tolerance.
 * @param publicClient Viem public client.
 * @param blockNumber Optional. The block number to use for the simulation.
 * @param includeSolvers Optional. The solvers to include.
 */
export async function optimalMintV2(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  fee: FeeAmount,
  tickLower: number,
  tickUpper: number,
  fromAddress: Address,
  slippage: number,
  publicClient: PublicClient,
  blockNumber?: bigint,
  includeSolvers: E_Solver[] = ALL_SOLVERS,
): Promise<SolverResult[]> {
  if (!token0Amount.currency.sortsBefore(token1Amount.currency)) {
    throw new Error('token0 must be sorted before token1');
  }
  if (!blockNumber) {
    blockNumber = await publicClient.getBlockNumber();
  }
  const token0 = token0Amount.currency.address as Address;
  const token1 = token1Amount.currency.address as Address;
  const mintParams: MintParams = {
    token0,
    token1,
    fee,
    tickLower,
    tickUpper,
    amount0Desired: BigInt(token0Amount.quotient.toString()),
    amount1Desired: BigInt(token1Amount.quotient.toString()),
    amount0Min: 0n,
    amount1Min: 0n,
    recipient: fromAddress,
    deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
  };

  const { poolAmountIn, zeroForOne } = await getOptimalSwapAmount(
    chainId,
    amm,
    publicClient,
    token0,
    token1,
    fee as FeeAmount,
    tickLower,
    tickUpper,
    mintParams.amount0Desired,
    mintParams.amount1Desired,
    blockNumber,
  );

  const solve = async (solver: E_Solver) => {
    try {
      const { swapData, swapRoute } = await getSolver(solver).optimalMint({
        chainId,
        amm,
        fromAddress,
        mintParams,
        slippage,
        poolAmountIn,
        zeroForOne,
      });
      const [, liquidity, amount0, amount1] = await simulateMintOptimal(
        chainId,
        amm,
        publicClient,
        fromAddress,
        mintParams,
        swapData,
        blockNumber,
      );

      const pool = await getPool(
        token0,
        token1,
        mintParams.fee,
        chainId,
        amm,
        publicClient,
        blockNumber,
      );

      return {
        solver,
        amount0,
        amount1,
        liquidity,
        swapData,
        swapRoute: getSwapRoute(
          token0,
          token1,
          amount0 - mintParams.amount0Desired,
          swapRoute,
        ),
        priceImpact: calcPriceImpact(
          pool,
          mintParams.amount0Desired,
          mintParams.amount1Desired,
          amount0,
          amount1,
        ),
        swapPath: getSwapPath(
          mintParams.token0,
          mintParams.token1,
          mintParams.amount0Desired,
          mintParams.amount1Desired,
          amount0,
          amount1,
          slippage,
        ),
      } as SolverResult;
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Solver ${solver} failed: ${e}`);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}
