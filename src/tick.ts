import {
  FeeAmount,
  TICK_SPACINGS,
  TickMath,
  nearestUsableTick,
  priceToClosestTick,
  tickToPrice,
} from '@aperture_finance/uniswap-v3-sdk';
import { Fraction, Price, Token } from '@uniswap/sdk-core';
import Big from 'big.js';
import JSBI from 'jsbi';

import { parsePrice } from './price';

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
// log_1.0001(2) = ln(2) / ln(1.0001) ~= 6932
export const DOUBLE_TICK = 6932;

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
 * Same as `priceToClosestTick` but returns `MIN_TICK` or `MAX_TICK` if the price is outside Uniswap's range.
 */
export function priceToClosestTickSafe(price: Price<Token, Token>): number {
  const sorted = price.baseCurrency.sortsBefore(price.quoteCurrency);
  if (price.lessThan(MIN_PRICE)) {
    return sorted ? TickMath.MIN_TICK : TickMath.MAX_TICK;
  } else if (price.greaterThan(MAX_PRICE)) {
    return sorted ? TickMath.MAX_TICK : TickMath.MIN_TICK;
  } else {
    return priceToClosestTick(price);
  }
}

/**
 * Given a human-readable price of `baseToken` denominated in `quoteToken`, calculate the closest tick.
 * @param humanPrice The human-readable price of `baseToken` denominated in `quoteToken`.
 * @param baseToken The base token.
 * @param quoteToken The quote token.
 * @returns The closest tick.
 */
export function humanPriceToClosestTick(
  baseToken: Token,
  quoteToken: Token,
  humanPrice: string,
): number {
  return priceToClosestTickSafe(parsePrice(baseToken, quoteToken, humanPrice));
}

/**
 * Finds the closest usable tick for the specified price and pool fee tier.
 * Price may be specified in either direction, i.e. both price of token1 denominated in token0 and price of token0
 * denominated in token1 work.
 * @param price Price of two tokens in the liquidity pool. Either token0 or token1 may be the base token.
 * @param poolFee Liquidity pool fee tier.
 * @returns The closest usable tick.
 */
export function priceToClosestUsableTick(
  price: Price<Token, Token>,
  poolFee: FeeAmount,
): number {
  return nearestUsableTick(
    priceToClosestTickSafe(price),
    TICK_SPACINGS[poolFee],
  );
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
 * Aligns price to the closest usable tick and returns the aligned price.
 * @param price The price to align.
 * @param tickSpacing Liquidity pool tick spacing.
 * @returns The aligned price.
 */
export function alignPriceToClosestUsableTickWithTickSpacing(
  price: Price<Token, Token>,
  tickSpacing: number,
): Price<Token, Token> {
  return tickToPrice(
    price.baseCurrency,
    price.quoteCurrency,
    nearestUsableTick(priceToClosestTickSafe(price), tickSpacing),
  );
}

/**
 * Returns the tick range for a limit order LP given a tick and width multiplier.
 * @param tick The desired average fill price of the limit order, not necessarily aligned to a usable tick.
 * @param poolFee The fee tier of the liquidity pool.
 * @param widthMultiplier The width multiplier of the tick range in terms of tick spacing.
 * @returns The tick range for the limit order.
 */
export function tickToLimitOrderRange(
  tick: number,
  poolFee: FeeAmount,
  widthMultiplier = 1,
): { tickAvg: number; tickLower: number; tickUpper: number } {
  if (!Number.isInteger(widthMultiplier) && widthMultiplier > 0)
    throw new Error('widthMultiplier must be a positive integer');
  const tickSpacing = TICK_SPACINGS[poolFee];
  const alignedTick = nearestUsableTick(tick, tickSpacing);
  const halfWidth = tickSpacing * (widthMultiplier / 2);
  const tickAvg =
    widthMultiplier % 2
      ? Math.floor(
          alignedTick > tick
            ? alignedTick - tickSpacing / 2
            : alignedTick + tickSpacing / 2,
        )
      : alignedTick;
  return {
    tickAvg,
    tickLower: Math.round(tickAvg - halfWidth),
    tickUpper: Math.round(tickAvg + halfWidth),
  };
}

/**
 * Returns token0's raw price in terms of token1.
 * @param tick The tick to query.
 * @returns The token0 price in terms of token1.
 */
export function tickToBigPrice(tick: number): Big {
  return new Big(
    JSBI.exponentiate(
      TickMath.getSqrtRatioAtTick(tick),
      JSBI.BigInt(2),
    ).toString(),
  ).div(Q192.toString());
}

/**
 * Returns the tick range for a position ratio and range width.
 * @param width The width of the range.
 * @param tickCurrent The current tick of the pool.
 * @param token0ValueProportion The proportion of the position value that is held in token0, as a `Big` number between 0
 * and 1, inclusive.
 * @returns The tick range for the position.
 */
export function rangeWidthRatioToTicks(
  width: number,
  tickCurrent: number,
  token0ValueProportion: Big,
): {
  tickLower: number;
  tickUpper: number;
} {
  let tickLower: number, tickUpper: number;
  if (token0ValueProportion.lt(0) || token0ValueProportion.gt(1)) {
    throw new Error('token0ValueProportion must be between 0 and 1');
  }
  if (token0ValueProportion.eq(0)) {
    tickLower = tickCurrent - width;
    tickUpper = tickCurrent;
  } else if (token0ValueProportion.eq(1)) {
    tickLower = tickCurrent;
    tickUpper = tickCurrent + width;
  } else {
    const price = tickToBigPrice(tickCurrent);
    const a = token0ValueProportion;
    const b = new Big(1).minus(a.times(2)).times(price.sqrt());
    const c = price
      .times(a.minus(new Big(1)))
      .div(tickToBigPrice(width).sqrt());
    const priceLowerSqrt = b
      .pow(2)
      .minus(a.times(c).times(4))
      .sqrt()
      .minus(b)
      .div(a.times(2));
    const sqrtRatioLowerX96 = JSBI.BigInt(
      priceLowerSqrt.times(new Big(Q96.toString())).toFixed(0),
    );
    tickLower = TickMath.getTickAtSqrtRatio(sqrtRatioLowerX96);
    tickUpper = tickLower + width;
  }
  return { tickLower, tickUpper };
}
