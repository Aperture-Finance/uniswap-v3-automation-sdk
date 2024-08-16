import { FeeAmount, Position } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount } from '@uniswap/smart-order-router';

import { CollectableTokenAmounts } from '../position';

export const MAX_FEE_PIPS = 1e18;
export const FEE_REBALANCE_USD = parseFloat(
  // Flat fee for rebalancing.
  process.env.FEE_REBALANCE_USD || '0.15',
);
export const FEE_REBALANCE_SWAP_RATIO = parseFloat(
  // Fees on the swap amount for rebalancing.
  process.env.FEE_REBALANCE_SWAP_RATIO || '0.0015',
);
export const FEE_SWAP_RATIO = parseFloat(
  // Fees on the swap amount.
  process.env.FEE_SWAP_RATIO || '0.0025',
);
const FEE_REINVEST_RATIO = JSON.parse(
  // Fees on the reinvest amount, included in autocompound and rebalance.
  process.env.FEE_REINVEST_RATIO ||
    '{"100": 0.0007, "500": 0.001, "2500": 0.0013, "3000": 0.0013, "10000": 0.0015}',
);
const FEE_DEFAULT_REINVEST_RATIO = parseFloat(
  // Default fee on the reinvest amount if FeeAmount not found, such as for slipstream.
  process.env.FEE_DEFAULT_REINVEST_RATIO || '0.001',
);

export function getFeeReinvestRatio(feeAmount: number) {
  return FEE_REINVEST_RATIO[feeAmount] || FEE_DEFAULT_REINVEST_RATIO;
}

function getFeeReinvestBipsFromSpecificToken(
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
        getFeeReinvestRatio(feeAmount) *
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

export function getFeeReinvestBips(
  position: Position,
  collectableTokenAmounts: CollectableTokenAmounts,
): bigint {
  const principalAmount0 = position.amount0;
  const principalAmount1 = position.amount1;
  if (principalAmount0.equalTo(0)) {
    if (principalAmount1.equalTo(0)) {
      return 0n;
    }
    return getFeeReinvestBipsFromSpecificToken(
      principalAmount1,
      collectableTokenAmounts.token1Amount,
      position.pool.fee,
    );
  }
  if (principalAmount1.equalTo(0)) {
    return getFeeReinvestBipsFromSpecificToken(
      principalAmount0,
      collectableTokenAmounts.token0Amount,
      position.pool.fee,
    );
  }
  const feeBips0 = getFeeReinvestBipsFromSpecificToken(
    principalAmount0,
    collectableTokenAmounts.token0Amount,
    position.pool.fee,
  );
  const feeBips1 = getFeeReinvestBipsFromSpecificToken(
    principalAmount1,
    collectableTokenAmounts.token1Amount,
    position.pool.fee,
  );
  return feeBips0 < feeBips1 ? feeBips0 : feeBips1;
}
