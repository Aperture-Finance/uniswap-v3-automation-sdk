import { ApertureMMVault__factory } from '@/index';
import { Address, encodeFunctionData } from 'viem';

import { MMVaultRebalanceParams } from './types';

export function getMMVaultDepositCalldata(
  depositAmount: bigint,
  receiver: Address,
  token0MaxAmount: bigint,
  token1MaxAmount: bigint,
) {
  return encodeFunctionData({
    abi: ApertureMMVault__factory.abi,
    args: [depositAmount, receiver, token0MaxAmount, token1MaxAmount] as const,
    functionName: 'deposit',
  });
}

export function getMMVaultWithdrawCalldata(
  withdrawAmount: bigint,
  receiver: Address,
  token0MinAmount: bigint,
  token1MinAmount: bigint,
) {
  return encodeFunctionData({
    abi: ApertureMMVault__factory.abi,
    args: [withdrawAmount, receiver, token0MinAmount, token1MinAmount] as const,
    functionName: 'withdraw',
  });
}

export function getMMVaultRebalanceCalldata(
  rebalanceParams: MMVaultRebalanceParams,
  gasFeeAmount: bigint,
  token0Fee: bigint,
  token1Fee: bigint,
) {
  return encodeFunctionData({
    abi: ApertureMMVault__factory.abi,
    args: [rebalanceParams, gasFeeAmount, token0Fee, token1Fee] as const,
    functionName: 'rebalance',
  });
}
