import { Token } from '@uniswap/sdk-core';
import {
  FeeAmount,
  TickMath,
  computePoolAddress as _computePoolAddress,
} from '@uniswap/v3-sdk';
import { BigNumberish } from 'ethers';
import JSBI from 'jsbi';

export type TickNumber = number;
export type LiquidityAmount = JSBI;
export type TickToLiquidityMap = Map<TickNumber, LiquidityAmount>;

/**
 * Normalizes the specified tick range.
 * @param tickCurrent The current tick.
 * @param tickSpacing The tick spacing.
 * @param tickLower The lower tick.
 * @param tickUpper The upper tick.
 * @returns The normalized tick range.
 */
export function normalizeTicks(
  tickCurrent: number,
  tickSpacing: number,
  tickLower: number,
  tickUpper: number,
): { tickCurrentAligned: number; tickLower: number; tickUpper: number } {
  if (tickLower > tickUpper) throw 'tickLower > tickUpper';
  // The current tick must be within the specified tick range.
  const tickCurrentAligned =
    Math.floor(tickCurrent / tickSpacing) * tickSpacing;
  tickLower = Math.min(
    Math.max(tickLower, TickMath.MIN_TICK),
    tickCurrentAligned,
  );
  tickUpper = Math.max(
    Math.min(tickUpper, TickMath.MAX_TICK),
    tickCurrentAligned,
  );
  return { tickCurrentAligned, tickLower, tickUpper };
}

/**
 * Reconstructs the liquidity array from the tick array and the current liquidity.
 * @param tickArray Sorted array containing the liquidity net for each tick.
 * @param tickCurrentAligned The current tick aligned to the tick spacing.
 * @param currentLiquidity The current pool liquidity.
 * @returns The reconstructed liquidity array.
 */
export function reconstructLiquidityArray(
  tickArray: Array<{ tick: number; liquidityNet: BigNumberish }>,
  tickCurrentAligned: number,
  currentLiquidity: JSBI,
): Array<[number, string]> {
  // Locate the tick in the populated ticks array with the current liquidity.
  const currentIndex =
    tickArray.findIndex(({ tick }) => tick > tickCurrentAligned) - 1;
  // Accumulate the liquidity from the current tick to the end of the populated ticks array.
  let cumulativeLiquidity = currentLiquidity;
  const liquidityArray = new Array<[number, string]>(tickArray.length);
  for (let i = currentIndex + 1; i < tickArray.length; i++) {
    // added when tick is crossed from left to right
    cumulativeLiquidity = JSBI.add(
      cumulativeLiquidity,
      JSBI.BigInt(tickArray[i].liquidityNet.toString()),
    );
    liquidityArray[i] = [tickArray[i].tick, cumulativeLiquidity.toString()];
  }
  cumulativeLiquidity = currentLiquidity;
  for (let i = currentIndex; i >= 0; i--) {
    liquidityArray[i] = [tickArray[i].tick, cumulativeLiquidity.toString()];
    // subtracted when tick is crossed from right to left
    cumulativeLiquidity = JSBI.subtract(
      cumulativeLiquidity,
      JSBI.BigInt(tickArray[i].liquidityNet.toString()),
    );
  }
  return liquidityArray;
}

/**
 * Computes a pool address
 * @param factoryAddress The Uniswap V3 factory address
 * @param token0 The first token of the pair, irrespective of sort order
 * @param token1 The second token of the pair, irrespective of sort order
 * @param fee The fee tier of the pool
 * @returns The pool address
 */
export function computePoolAddress(
  factoryAddress: string,
  token0: Token | string,
  token1: Token | string,
  fee: FeeAmount,
): string {
  return _computePoolAddress({
    factoryAddress,
    tokenA: new Token(
      1,
      typeof token0 === 'string' ? token0 : token0.address,
      18,
    ),
    tokenB: new Token(
      1,
      typeof token1 === 'string' ? token1 : token1.address,
      18,
    ),
    fee,
  });
}
