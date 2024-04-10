import { TickMath } from '@aperture_finance/uniswap-v3-sdk';
import { Token } from '@uniswap/sdk-core';
import { BigNumberish } from 'ethers';
import JSBI from 'jsbi';

import { checkTokenLiquidityAgainstChainNativeCurrency } from '../currency';

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
 * Returns the liquidity amount at the specified tick.
 * @param tickToLiquidityMap Sorted map from tick to liquidity amount.
 * @param tick The tick to query.
 * @returns The liquidity amount at the specified tick.
 */
export function readTickToLiquidityMap(
  tickToLiquidityMap: TickToLiquidityMap,
  tick: TickNumber,
): LiquidityAmount {
  if (tickToLiquidityMap.get(tick) !== undefined) {
    return tickToLiquidityMap.get(tick)!;
  } else {
    const key = [...tickToLiquidityMap.keys()].findIndex((t) => t > tick) - 1;
    if (key >= 0) {
      return tickToLiquidityMap.get(key)!;
    }
  }
  return JSBI.BigInt(0);
}

/**
 * Checks whether the specified pool is supported by Aperture automation, i.e. pre-scheduled position close, rebalance, auto-compound, etc.
 * @param tokenA One of the tokens in the pool.
 * @param tokenB The other token in the pool.
 */
export async function checkAutomationSupportForPool(
  tokenA: Token,
  tokenB: Token,
): Promise<boolean> {
  const [quoteA, quoteB] = await Promise.all([
    checkTokenLiquidityAgainstChainNativeCurrency(
      tokenA.chainId,
      tokenA.address,
    ),
    checkTokenLiquidityAgainstChainNativeCurrency(
      tokenB.chainId,
      tokenB.address,
    ),
  ]);
  return quoteA !== '-1' && quoteB !== '-1';
}
