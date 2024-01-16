import { fractionToBig, getTokenValueProportionFromPriceRatio } from '@/index';
import { Position } from '@uniswap/v3-sdk';
import Big from 'big.js';

/**
 * Predict the position after rebalance assuming the pool price remains the same.
 * @param position Position info before rebalance.
 * @param newTickLower The new lower tick.
 * @param newTickUpper The new upper tick.
 * @returns The position info after rebalance.
 */
export function getRebalancedPosition(
  position: Position,
  newTickLower: number,
  newTickUpper: number,
): Position {
  const price = position.pool.token0Price;
  // Calculate the position equity denominated in token1 before rebalance.
  const equityInToken1Before = price
    .quote(position.amount0)
    .add(position.amount1);
  const equityBefore = fractionToBig(equityInToken1Before);
  const bigPrice = fractionToBig(price);
  const token0Proportion = getTokenValueProportionFromPriceRatio(
    newTickLower,
    newTickUpper,
    bigPrice,
  );
  const amount1After = new Big(1).sub(token0Proportion).mul(equityBefore);
  // token0's equity denominated in token1 divided by the price
  const amount0After = new Big(equityBefore).sub(amount1After).div(bigPrice);
  return Position.fromAmounts({
    pool: position.pool,
    tickLower: newTickLower,
    tickUpper: newTickUpper,
    amount0: amount0After.toFixed(0),
    amount1: amount1After.toFixed(0),
    useFullPrecision: false,
  });
}
