import { getAptrFee } from '@/fee';
import { Position } from '@aperture_finance/uniswap-v3-sdk';
import { floor } from 'lodash';

import { CollectableTokenAmounts } from '../position';

export const MAX_FEE_PIPS = 1e18;

export function getFeeBips(
  position: Position,
  collectableTokenAmounts: CollectableTokenAmounts,
): bigint {
  const principalAmount0 = position.amount0;
  const principalAmount1 = position.amount1;
  if (
    Number(principalAmount0.toSignificant()) === 0 ||
    Number(principalAmount1.toSignificant()) === 0
  ) {
    // Can't charge fees based on a percent of the principal if the principal is 0.
    return BigInt(0);
  }
  const feeBips0 = collectableTokenAmounts.token0Amount
    .multiply(
      getAptrFee(position.pool.fee) * 10 ** principalAmount0.currency.decimals,
    )
    .divide(principalAmount0);
  const feeBips1 = collectableTokenAmounts.token1Amount
    .multiply(
      getAptrFee(position.pool.fee) * 10 ** principalAmount1.currency.decimals,
    )
    .divide(principalAmount1);
  return BigInt(
    floor(
      Number((feeBips0 < feeBips1 ? feeBips0 : feeBips1).toSignificant()) *
        MAX_FEE_PIPS,
    ),
  );
}
