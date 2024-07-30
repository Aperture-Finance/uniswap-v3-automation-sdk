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
  const feeBips0: string =
    Number(principalAmount0.toSignificant()) === 0
      ? '1.0'
      : collectableTokenAmounts.token0Amount
          .multiply(
            getAptrFee(position.pool.fee) *
              10 ** principalAmount0.currency.decimals, // The decimals will cancel out when dividing, so multiply it back in to get the correct fee ratio.
          )
          .divide(principalAmount0)
          .toSignificant();
  const feeBips1: string =
    Number(principalAmount1.toSignificant()) === 0
      ? '1.0'
      : collectableTokenAmounts.token1Amount
          .multiply(
            getAptrFee(position.pool.fee) *
              10 ** principalAmount1.currency.decimals, // Same comment as above.
          )
          .divide(principalAmount1)
          .toSignificant();
  return BigInt(
    // The feePips will be divided by MAX_FEE_PIPS in the smart contract at
    // https://github.com/Aperture-Finance/uniswap-v3-automan/blob/149425cb0a3b6082a46cc064e71f457c13377209/src/base/Automan.sol#L309C32-L309C52
    // so multiply by MAX_FEE_PIPS to charge the correct fee ratio.
    floor(Number(feeBips0 < feeBips1 ? feeBips0 : feeBips1) * MAX_FEE_PIPS),
  );
}
