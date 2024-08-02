import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';

const POOL_FEE_TO_APTR_FEE: {
  [key in FeeAmount]: number;
} = {
  [FeeAmount.LOWEST]: 0.0007,
  [FeeAmount.LOW]: 0.001,
  [FeeAmount.PCS_V3_MEDIUM]: 0.0013,
  [FeeAmount.MEDIUM]: 0.0013,
  [FeeAmount.HIGH]: 0.0015,
};

export function getAptrFee(feeAmount: FeeAmount) {
  return POOL_FEE_TO_APTR_FEE[feeAmount];
}
