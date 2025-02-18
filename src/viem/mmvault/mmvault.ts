import {
  ApertureMMVaultHelper__factory,
  ApertureMMVault__factory,
} from '@/index';
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
import { getMMVaultRebalanceCalldata } from './getMMVaultCalldata';
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

export function getMMVaultHelperContract(
  publicClient?: PublicClient,
  walletClient?: WalletClient,
): GetContractReturnType<
  typeof ApertureMMVaultHelper__factory.abi,
  PublicClient | WalletClient
> {
  return getContract({
    address: '0x89E4bE1F999E3a58D16096FBe405Fc2a1d7F07D6',
    abi: ApertureMMVaultHelper__factory.abi,
    client: walletClient ?? publicClient!,
  });
}

export async function simulateMMVaultRebalance(
  mMVaultAddress: Address,
  rebalanceParams: MMVaultRebalanceParams,
  gasFeeAmount: bigint,
  token0Fee: bigint,
  token1Fee: bigint,
  publicClient: PublicClient,
  from: Address,
  blockNumber?: bigint,
): Promise<MMVaultRebalanceReturnType> {
  const returnData = await requestMMVaultRebalance(
    'eth_call',
    mMVaultAddress,
    rebalanceParams,
    gasFeeAmount,
    token0Fee,
    token1Fee,
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
  token0Fee = BigInt(0),
  token1Fee = BigInt(0),
  from: Address,
  blockNumber?: bigint,
): Promise<bigint> {
  return hexToBigInt(
    await requestMMVaultRebalance(
      'eth_estimateGas',
      mMVaultAddress,
      rebalanceParams,
      /* gasFeeAmount= */ BigInt(1), // Include gas fee of reimbursing gas fee.
      token0Fee,
      token1Fee,
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
  token0Fee: bigint,
  token1Fee: bigint,
  publicClient: PublicClient,
  from: Address,
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  const data = getMMVaultRebalanceCalldata(
    rebalanceParams,
    gasFeeAmount,
    token0Fee,
    token1Fee,
  );
  return tryRequestWithOverrides(
    method,
    {
      from,
      to: mMVaultAddress,
      data,
    },
    publicClient,
    /* overrides= */ undefined,
    blockNumber,
  );
}
