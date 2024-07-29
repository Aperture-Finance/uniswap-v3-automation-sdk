import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';

const POOL_FEE_TO_APTR_FEE: {
  [key in FeeAmount]: number;
} = {
  [FeeAmount.LOWEST]: 0.001,
  [FeeAmount.LOW]: 0.001,
  [FeeAmount.PCS_V3_MEDIUM]: 0.001,
  [FeeAmount.MEDIUM]: 0.001,
  [FeeAmount.HIGH]: 0.001,
};

export function getAptrFee(feeAmount: FeeAmount) {
  return POOL_FEE_TO_APTR_FEE[feeAmount];
}
