import { Address } from 'viem';

import {
  getMMVaultDepositCalldata,
  getMMVaultWithdrawCalldata,
} from '../mmvault';

export async function getMMVaultDepositTx(
  messageSender: Address,
  mMVaultAddress: Address,
  depositAmount: bigint,
  token0MaxAmount: bigint,
  token1MaxAmount: bigint,
) {
  return {
    tx: {
      from: messageSender,
      to: mMVaultAddress,
      data: getMMVaultDepositCalldata(
        depositAmount,
        /* receiver= */ messageSender,
        token0MaxAmount,
        token1MaxAmount,
      ),
    },
  };
}

export async function getMMVaultWithdrawTx(
  messageSender: Address,
  mMVaultAddress: Address,
  withdrawAmount: bigint,
  token0MinAmount: bigint,
  token1MinAmount: bigint,
) {
  return {
    tx: {
      from: messageSender,
      to: mMVaultAddress,
      data: getMMVaultWithdrawCalldata(
        withdrawAmount,
        /* receiver= */ messageSender,
        token0MinAmount,
        token1MinAmount,
      ),
    },
  };
}
