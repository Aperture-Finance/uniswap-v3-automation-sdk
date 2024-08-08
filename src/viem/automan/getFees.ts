import { getAptrFeesOnLpFees } from '@/fees';
import { FeeAmount, Position } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount } from '@uniswap/smart-order-router';

import { CollectableTokenAmounts } from '../position';

export const MAX_FEE_PIPS = 1e18;

function getFeeBipsFromSpecificToken(
  principalAmount: CurrencyAmount,
  collectableTokenAmount: CurrencyAmount,
  feeAmount: FeeAmount,
): bigint {
  const feeBipsFromSpecificToken = BigInt(
    collectableTokenAmount
      // The feePips will be divided by MAX_FEE_PIPS in the smart contract at
      // https://github.com/Aperture-Finance/uniswap-v3-automan/blob/149425cb0a3b6082a46cc064e71f457c13377209/src/base/Automan.sol#L309C32-L309C52
      // so multiply by MAX_FEE_PIPS to charge the correct fee ratio.
      .multiply(MAX_FEE_PIPS)
      .multiply(
        getAptrFeesOnLpFees(feeAmount) *
          10 ** principalAmount.currency.decimals,
      ) // Cancel out the decimals between the feesCollects and principal.
      .divide(principalAmount)
      .toFixed(0),
  );
  // Cap the feeBips to MAX_FEE_PIPS to prevent overflow in the smart contract due to
  // https://github.com/Aperture-Finance/uniswap-v3-automan/blob/149425cb0a3b6082a46cc064e71f457c13377209/src/base/Automan.sol#L308
  return feeBipsFromSpecificToken < BigInt(MAX_FEE_PIPS)
    ? feeBipsFromSpecificToken
    : BigInt(MAX_FEE_PIPS);
}

export function getFeeBips(
  position: Position,
  collectableTokenAmounts: CollectableTokenAmounts,
): bigint {
  const principalAmount0 = position.amount0;
  const principalAmount1 = position.amount1;
  if (principalAmount0.equalTo(0)) {
    if (principalAmount1.equalTo(0)) {
      return 0n;
    }
    return getFeeBipsFromSpecificToken(
      principalAmount1,
      collectableTokenAmounts.token1Amount,
      position.pool.fee,
    );
  }
  if (principalAmount1.equalTo(0)) {
    return getFeeBipsFromSpecificToken(
      principalAmount0,
      collectableTokenAmounts.token0Amount,
      position.pool.fee,
    );
  }
  const feeBips0 = getFeeBipsFromSpecificToken(
    principalAmount0,
    collectableTokenAmounts.token0Amount,
    position.pool.fee,
  );
  const feeBips1 = getFeeBipsFromSpecificToken(
    principalAmount1,
    collectableTokenAmounts.token1Amount,
    position.pool.fee,
  );
  return feeBips0 < feeBips1 ? feeBips0 : feeBips1;
}
