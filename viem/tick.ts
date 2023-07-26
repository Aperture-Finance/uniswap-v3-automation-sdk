import { Fraction, Price, Token } from '@uniswap/sdk-core';
import {
  FeeAmount,
  TICK_SPACINGS,
  TickMath,
  nearestUsableTick,
  priceToClosestTick,
  tickToPrice,
} from '@uniswap/v3-sdk';
import JSBI from 'jsbi';

import { LiquidityAmount, TickNumber, TickToLiquidityMap } from './pool';

const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96));
const Q192 = JSBI.multiply(Q96, Q96);
export const MIN_PRICE = new Fraction(
  JSBI.multiply(TickMath.MIN_SQRT_RATIO, TickMath.MIN_SQRT_RATIO),
  Q192,
);
export const MAX_PRICE = new Fraction(
  JSBI.subtract(
    JSBI.multiply(TickMath.MAX_SQRT_RATIO, TickMath.MAX_SQRT_RATIO),
    JSBI.BigInt(1),
  ),
  Q192,
);

/**
 * Returns a price object corresponding to the sqrt ratio and the base/quote token
 * @param sqrtRatioX96 The sqrt ratio as a Q64.96
 * @param baseToken The base token of the price
 * @param quoteToken The quote token of the price
 * @returns The price corresponding to the input sqrt ratio
 */
export function sqrtRatioToPrice(
  sqrtRatioX96: JSBI,
  baseToken: Token,
  quoteToken: Token,
): Price<Token, Token> {
  const ratioX192 = JSBI.exponentiate(sqrtRatioX96, JSBI.BigInt(2));
  return baseToken.sortsBefore(quoteToken)
    ? new Price(baseToken, quoteToken, Q192, ratioX192)
    : new Price(baseToken, quoteToken, ratioX192, Q192);
}

/**
 * Finds the closest usable tick for the specified price and pool fee tier.
 * Price may be specified in either direction, i.e. price of token1 denominated in token0 and price of token0 denominated in token1 both work.
 * @param price Price of two tokens in the liquidity pool. Either token0 or token1 may be the base token.
 * @param poolFee Liquidity pool fee tier.
 * @returns The closest usable tick.
 */
export function priceToClosestUsableTick(
  price: Price<Token, Token>,
  poolFee: FeeAmount,
): number {
  let tick: number;
  const sorted = price.baseCurrency.sortsBefore(price.quoteCurrency);
  if (price.lessThan(MIN_PRICE)) {
    tick = sorted ? TickMath.MIN_TICK : TickMath.MAX_TICK;
  } else if (price.greaterThan(MAX_PRICE)) {
    tick = sorted ? TickMath.MAX_TICK : TickMath.MIN_TICK;
  } else {
    tick = priceToClosestTick(price);
  }
  return nearestUsableTick(tick, TICK_SPACINGS[poolFee]);
}

/**
 * Aligns price to the closest usable tick and returns the aligned price.
 * @param price The price to align.
 * @param poolFee Liquidity pool fee tier.
 * @returns The aligned price.
 */
export function alignPriceToClosestUsableTick(
  price: Price<Token, Token>,
  poolFee: FeeAmount,
): Price<Token, Token> {
  return tickToPrice(
    price.baseCurrency,
    price.quoteCurrency,
    priceToClosestUsableTick(price, poolFee),
  );
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
    for (const [_tick, liquidity] of tickToLiquidityMap) {
      if (_tick >= tick) {
        return liquidity;
      }
    }
  }
  return JSBI.BigInt(0);
}
