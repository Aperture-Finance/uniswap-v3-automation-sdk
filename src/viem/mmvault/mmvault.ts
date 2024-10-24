import { ApertureMMVault__factory } from '@/index';
import {
  Address,
  GetContractReturnType,
  PublicClient,
  WalletClient,
  decodeFunctionResult,
  getContract,
  hexToBigInt,
} from 'viem';

import { RpcReturnType, tryRequestWithOverrides } from '../overrides';
import { getMMVaultRebalanceCalldata } from './getMMVaultCallData';
import { MMVaultRebalanceParams, MMVaultRebalanceReturnType } from './types';

export function getMMVaultContract(
  mMVaultAddress: Address,
  publicClient?: PublicClient,
  walletClient?: WalletClient,
): GetContractReturnType<
  typeof ApertureMMVault__factory.abi,
  PublicClient | WalletClient
> {
  return getContract({
    address: mMVaultAddress,
    abi: ApertureMMVault__factory.abi,
    client: walletClient ?? publicClient!,
  });
}

export async function simulateMMVaultRebalance(
  mMVaultAddress: Address,
  rebalanceParams: MMVaultRebalanceParams,
  gasFeeAmount: bigint,
  publicClient: PublicClient,
  from: Address,
  blockNumber?: bigint,
): Promise<MMVaultRebalanceReturnType> {
  const returnData = await requestMMVaultRebalance(
    'eth_call',
    mMVaultAddress,
    rebalanceParams,
    gasFeeAmount,
    publicClient,
    from,
    blockNumber,
  );
  return decodeFunctionResult({
    abi: ApertureMMVault__factory.abi,
    data: returnData,
    functionName: 'rebalance',
  });
}

export async function estimateMMVaultRebalanceGas(
  mMVaultAddress: Address,
  rebalanceParams: MMVaultRebalanceParams,
  publicClient: PublicClient,
  from: Address,
  blockNumber?: bigint,
): Promise<bigint> {
  return hexToBigInt(
    await requestMMVaultRebalance(
      'eth_estimateGas',
      mMVaultAddress,
      rebalanceParams,
      /* gasFeeAmount= */ BigInt(1), // Include gas fee of reimbursing gas fee.
      publicClient,
      from,
      blockNumber,
    ),
  );
}

export async function requestMMVaultRebalance<M extends keyof RpcReturnType>(
  method: M,
  mMVaultAddress: Address,
  rebalanceParams: MMVaultRebalanceParams,
  gasFeeAmount: bigint,
  publicClient: PublicClient,
  from: Address,
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  const data = getMMVaultRebalanceCalldata(rebalanceParams, gasFeeAmount);
  return tryRequestWithOverrides(
    method,
    {
      from,
      to: mMVaultAddress,
      data,
    },
    publicClient,
    /* overrides= */ {},
    blockNumber,
  );
}
