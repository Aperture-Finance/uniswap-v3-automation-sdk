import { priceToSqrtRatioX96 } from '@/index';
import { Pool, Position, TickMath } from '@aperture_finance/uniswap-v3-sdk';
import Big from 'big.js';

import { getRebalancedPosition } from './getRebalancedPosition';

/**
 * Predict the position after rebalance assuming the pool price becomes the specified price.
 * @param position Position info before rebalance.
 * @param newPrice The pool price at rebalance.
 * @param newTickLower The new lower tick.
 * @param newTickUpper The new upper tick.
 * @returns The position info after rebalance.
 */
export function projectRebalancedPositionAtPrice(
  position: Position,
  newPrice: Big,
  newTickLower: number,
  newTickUpper: number,
): Position {
  return getRebalancedPosition(
    getPositionAtPrice(position, newPrice),
    newTickLower,
    newTickUpper,
  );
}

/**
 * Predict the position if the pool price becomes the specified price.
 * @param position Position info.
 * @param newPrice The new pool price.
 * @returns The position info after the pool price becomes the specified price.
 */
export function getPositionAtPrice(
  position: Position,
  newPrice: Big,
): Position {
  const sqrtPriceX96 = priceToSqrtRatioX96(newPrice);
  const poolAtNewPrice = new Pool(
    position.pool.token0,
    position.pool.token1,
    position.pool.fee,
    sqrtPriceX96,
    position.pool.liquidity,
    TickMath.getTickAtSqrtRatio(sqrtPriceX96),
  );
  return new Position({
    pool: poolAtNewPrice,
    liquidity: position.liquidity,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
  });
}
