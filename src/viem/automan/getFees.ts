import { getAptrFee } from '@/fee';
import { CollectableTokenAmounts } from '../position';
import { Position } from '@aperture_finance/uniswap-v3-sdk';

export const MAX_FEE_PIPS = BigInt(1e18);

export function getFeeBips(position: Position, collectableTokenAmounts: CollectableTokenAmounts): BigInt {
  const principalAmount0 = position.amount0;
  const principalAmount1 = position.amount1;
  if (Number(principalAmount0.toSignificant()) === 0 || Number(principalAmount1.toSignificant()) === 0) {
    // Can't charge fees based on a percent of the principal if the principal is 0.
    return BigInt(0);
  }
  const feeBips0 = BigInt(collectableTokenAmounts.token0Amount.multiply(getAptrFee(position.pool.fee)*10**principalAmount0.currency.decimals).divide(principalAmount0).toSignificant());
  const feeBips1 = BigInt(collectableTokenAmounts.token1Amount.multiply(getAptrFee(position.pool.fee)*10**principalAmount1.currency.decimals).divide(principalAmount1).toSignificant());
  return feeBips0 < feeBips1 ? feeBips0 : feeBips1;
}
