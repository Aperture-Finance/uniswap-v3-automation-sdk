// import { MMVaultBurnParams, UniV3MintParams } from '../automan';
import { ApertureMMVault__factory } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex, encodeFunctionData } from 'viem';

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
) {
  return encodeFunctionData({
    abi: ApertureMMVault__factory.abi,
    args: [rebalanceParams] as const,
    functionName: 'rebalance',
  });
}
