import { getAptrFee } from '@/fee';
import { Position } from '@aperture_finance/uniswap-v3-sdk';
import { Fraction } from '@uniswap/sdk-core';
import { CurrencyAmount } from '@uniswap/smart-order-router';
import Big from 'big.js';
import { floor } from 'lodash';

import { CollectableTokenAmounts } from '../position';
import JSBI from 'jsbi';

export const MAX_FEE_PIPS = 1e18;

export function getFeeBips(
  position: Position,
  collectableTokenAmounts: CollectableTokenAmounts,
): CurrencyAmount {
  const principalAmount0 = position.amount0;
  const principalAmount1 = position.amount1;
  const feeBips0: CurrencyAmount = principalAmount0.equalTo(0)
    ? CurrencyAmount.fromRawAmount(position.pool.token0, MAX_FEE_PIPS)
    : collectableTokenAmounts.token0Amount
        // The feePips will be divided by MAX_FEE_PIPS in the smart contract at
        // https://github.com/Aperture-Finance/uniswap-v3-automan/blob/149425cb0a3b6082a46cc064e71f457c13377209/src/base/Automan.sol#L309C32-L309C52
        // so multiply by MAX_FEE_PIPS to charge the correct fee ratio.
        .multiply(MAX_FEE_PIPS)
        .multiply(
          getAptrFee(position.pool.fee) *
            10 ** principalAmount0.currency.decimals, // The decimals will cancel out when dividing, so multiply it back in to get the correct fee ratio.
        )
        .divide(principalAmount0);
  const feeBips1: CurrencyAmount = principalAmount1.equalTo(0)
    ? CurrencyAmount.fromRawAmount(position.pool.token1, MAX_FEE_PIPS)
    : collectableTokenAmounts.token1Amount
        .multiply(MAX_FEE_PIPS)
        .multiply(
          getAptrFee(position.pool.fee) *
            10 ** principalAmount1.currency.decimals, // Same comment as above.
        )
        .divide(principalAmount1);
  console.log(
    `feeBips0 = ${feeBips0.toSignificant()}, feeBips1 = ${feeBips1.toSignificant()}, feeBips0=${feeBips0.numerator},${feeBips0.denominator}, feeBips1=${feeBips1.numerator},${feeBips1.denominator}, feeBips0.lessThan(feeBips1)=${feeBips0.lessThan(feeBips1)}`,
  );
  const left = JSBI.multiply(feeBips0.numerator, feeBips1.denominator);
  const right = JSBI.multiply(feeBips1.numerator, feeBips0.denominator);
  console.log(`left=${left}, right=${right}`);
  return feeBips0.lessThan(feeBips1) ? feeBips0 : feeBips1;
}
