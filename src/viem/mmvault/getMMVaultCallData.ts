import { ApertureMMVault__factory } from '@/index';
import { Address, encodeFunctionData } from 'viem';

import { MMVaultRebalanceParams } from './types';

export function getMMVaultMintCalldata(
  mintAmount = BigInt(0),
  receiver: Address,
) {
  return encodeFunctionData({
    abi: ApertureMMVault__factory.abi,
    args: [mintAmount, receiver] as const,
    functionName: 'mint',
  });
}

export function getMMVaultBurnCalldata(
  burnAmount = BigInt(0),
  receiver: Address,
) {
  return encodeFunctionData({
    abi: ApertureMMVault__factory.abi,
    args: [burnAmount, receiver] as const,
    functionName: 'burn',
  });
}

export function getMMVaultRebalanceCalldata(
  rebalanceParams: MMVaultRebalanceParams,
  gasFeeAmount: bigint,
) {
  return encodeFunctionData({
    abi: ApertureMMVault__factory.abi,
    args: [rebalanceParams, gasFeeAmount] as const,
    functionName: 'rebalance',
  });
}
