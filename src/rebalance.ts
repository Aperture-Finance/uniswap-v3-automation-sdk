import { Pool, nearestUsableTick } from '@uniswap/v3-sdk';
import Big from 'big.js';

import {
  Action,
  ActionTypeEnum,
  ConditionTypeEnum,
  PriceCondition,
  RecurringCondition,
  RecurringConditionTypeEnum,
} from './interfaces';
import {
  fractionToBig,
  getRawRelativePriceFromTokenValueProportion,
  parsePrice,
} from './price';
import {
  humanPriceToClosestTick,
  rangeWidthRatioToTicks,
  tickToBigPrice,
} from './tick';

/**
 * Convert a recurring rebalance condition to a price condition.
 * @param condition The recurring condition to convert.
 * @param pool The underlying Uniswap V3 pool.
 * @param tickLower The lower tick of the target range for `RecurringRatio` condition.
 * @param tickUpper The upper tick of the target range for `RecurringRatio` condition.
 * @returns The converted price condition.
 */
export function convertRecurringCondition(
  condition: RecurringCondition,
  pool: Pool,
  tickLower?: number,
  tickUpper?: number,
): PriceCondition {
  Big.DP = 30;
  if (condition.type === RecurringConditionTypeEnum.enum.RecurringPercentage) {
    if (
      condition.gteTickOffset === undefined &&
      condition.lteTickOffset === undefined
    ) {
      throw new Error('Invalid tickOffset');
    }
    const gte =
      condition.gteTickOffset !== undefined
        ? tickToBigPrice(pool.tickCurrent + condition.gteTickOffset)
        : undefined;
    const lte =
      condition.lteTickOffset !== undefined
        ? tickToBigPrice(pool.tickCurrent + condition.lteTickOffset)
        : undefined;
    return {
      type: ConditionTypeEnum.enum.Price,
      durationSec: condition.durationSec,
      frontendType: 'RELATIVE_PRICE',
      gte: gte?.toString(),
      lte: lte?.toString(),
    };
  } else if (
    condition.type === RecurringConditionTypeEnum.enum.RecurringPrice
  ) {
    if (
      condition.gtePriceOffset === undefined &&
      condition.ltePriceOffset === undefined
    ) {
      throw new Error('Invalid priceOffset');
    }
    const currentPrice0 = fractionToBig(pool.token0Price);
    // human-readable price offset
    const gtePriceOffset = condition.gtePriceOffset
      ? new Big(condition.gtePriceOffset)
      : undefined;
    if (gtePriceOffset?.lte(0)) {
      throw new Error('gtePriceOffset must be positive');
    }
    const ltePriceOffset = condition.ltePriceOffset
      ? new Big(condition.ltePriceOffset)
      : undefined;
    if (ltePriceOffset?.gte(0)) {
      throw new Error('ltePriceOffset must be negative');
    }
    let gteTriggerPrice: Big | undefined, lteTriggerPrice: Big | undefined;
    if (condition.baseToken === 0) {
      if (gtePriceOffset !== undefined) {
        gteTriggerPrice = currentPrice0.add(
          fractionToBig(
            parsePrice(
              pool.token0,
              pool.token1,
              gtePriceOffset.abs().toString(),
            ),
          ),
        );
      }
      if (ltePriceOffset !== undefined) {
        lteTriggerPrice = currentPrice0.sub(
          fractionToBig(
            parsePrice(
              pool.token0,
              pool.token1,
              ltePriceOffset.abs().toString(),
            ),
          ),
        );
      }
    } else {
      const currentPrice1 = fractionToBig(pool.token1Price);
      if (gtePriceOffset !== undefined) {
        const triggerPrice1 = currentPrice1.add(
          fractionToBig(
            parsePrice(
              pool.token1,
              pool.token0,
              gtePriceOffset.abs().toString(),
            ),
          ),
        );
        lteTriggerPrice = new Big(1).div(triggerPrice1);
      }
      if (ltePriceOffset !== undefined) {
        const triggerPrice1 = currentPrice1.sub(
          fractionToBig(
            parsePrice(
              pool.token1,
              pool.token0,
              ltePriceOffset.abs().toString(),
            ),
          ),
        );
        gteTriggerPrice = new Big(1).div(triggerPrice1);
      }
    }
    return {
      type: ConditionTypeEnum.enum.Price,
      durationSec: condition.durationSec,
      frontendType: 'RELATIVE_PRICE',
      gte: gteTriggerPrice?.toString(),
      lte: lteTriggerPrice?.toString(),
    };
  } else if (
    condition.type === RecurringConditionTypeEnum.enum.RecurringRatio
  ) {
    const currentPrice0 = fractionToBig(pool.token0Price);
    const gteTriggerPrice = condition.lteToken0ValueProportion
      ? getRawRelativePriceFromTokenValueProportion(
          tickLower!,
          tickUpper!,
          new Big(condition.lteToken0ValueProportion),
        )
      : undefined;
    if (gteTriggerPrice?.lte(currentPrice0)) {
      throw new Error('gteTriggerPrice must be greater than current price');
    }
    const lteTriggerPrice = condition.gteToken0ValueProportion
      ? getRawRelativePriceFromTokenValueProportion(
          tickLower!,
          tickUpper!,
          new Big(condition.gteToken0ValueProportion),
        )
      : undefined;
    if (lteTriggerPrice?.gte(currentPrice0)) {
      throw new Error('lteTriggerPrice must be less than current price');
    }
    return {
      type: ConditionTypeEnum.enum.Price,
      durationSec: condition.durationSec,
      frontendType: 'POSITION_VALUE_RATIO',
      gte: gteTriggerPrice?.toString(),
      lte: lteTriggerPrice?.toString(),
    };
  } else {
    throw new Error('Invalid recurring condition type');
  }
}

/**
 * Normalize the tick range for a rebalance action.
 * @param action The rebalance action.
 * @param pool The underlying Uniswap V3 pool.
 * @returns The normalized tick range.
 */
export function normalizeTicks(action: Action, pool: Pool) {
  let tickLower: number, tickUpper: number;
  if (action.type == ActionTypeEnum.enum.Rebalance) {
    tickLower =
      action.tickLower + (action.isCurrentTickOffset ? pool.tickCurrent : 0);
    tickUpper =
      action.tickUpper + (action.isCurrentTickOffset ? pool.tickCurrent : 0);
  } else if (action.type === ActionTypeEnum.enum.RecurringPercentage) {
    tickLower = pool.tickCurrent + action.tickLowerOffset;
    tickUpper = pool.tickCurrent + action.tickUpperOffset;
  } else if (action.type === ActionTypeEnum.enum.RecurringPrice) {
    const isToken0 = action.baseToken === 0;
    const price = isToken0 ? pool.token0Price : pool.token1Price;
    const bigPrice = fractionToBig(price).mul(
      new Big(10).pow(
        isToken0
          ? pool.token0.decimals - pool.token1.decimals
          : pool.token1.decimals - pool.token0.decimals,
      ),
    );
    const lowerPrice = bigPrice.add(action.priceLowerOffset);
    const upperPrice = bigPrice.add(action.priceUpperOffset);
    tickLower = humanPriceToClosestTick(
      isToken0 ? pool.token0 : pool.token1,
      isToken0 ? pool.token1 : pool.token0,
      lowerPrice.toString(),
    );
    tickUpper = humanPriceToClosestTick(
      isToken0 ? pool.token0 : pool.token1,
      isToken0 ? pool.token1 : pool.token0,
      upperPrice.toString(),
    );
  } else if (action.type === ActionTypeEnum.enum.RecurringRatio) {
    ({ tickLower, tickUpper } = rangeWidthRatioToTicks(
      action.tickRangeWidth,
      pool.tickCurrent,
      new Big(action.token0ValueProportion),
    ));
  } else {
    throw new Error('Invalid action type');
  }
  tickLower = nearestUsableTick(tickLower, pool.tickSpacing);
  tickUpper = nearestUsableTick(tickUpper, pool.tickSpacing);
  if (tickUpper - tickLower < pool.tickSpacing) {
    throw new Error(
      'tickUpper - tickLower must be greater than or equal to tickSpacing',
    );
  }
  return { tickLower, tickUpper };
}
