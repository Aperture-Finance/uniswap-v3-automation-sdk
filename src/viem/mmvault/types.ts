import { ApertureMMVault__factory } from '@/index';
import {
  AbiStateMutability,
  ContractFunctionArgs,
  ContractFunctionReturnType,
} from 'viem';

import { GetAbiFunctionParamsTypes } from '../generics';

export type MMVaultActionName = 'mint' | 'burn' | 'rebalance';

export type GetMMVaultParams<T extends MMVaultActionName> =
  GetAbiFunctionParamsTypes<typeof ApertureMMVault__factory.abi, T>;

export type GetMMVaultReturnTypes<
  functionName extends MMVaultActionName,
  args extends ContractFunctionArgs<
    typeof ApertureMMVault__factory.abi,
    AbiStateMutability,
    functionName
  > = ContractFunctionArgs<
    typeof ApertureMMVault__factory.abi,
    AbiStateMutability,
    functionName
  >,
> = ContractFunctionReturnType<
  typeof ApertureMMVault__factory.abi,
  AbiStateMutability,
  functionName,
  args // to dedup function name
>;

export type MMVaultMintParams = GetAbiFunctionParamsTypes<
  typeof ApertureMMVault__factory.abi,
  'mint'
>[0];

export type MMVaultBurnParams = GetAbiFunctionParamsTypes<
  typeof ApertureMMVault__factory.abi,
  'burn'
>[0];

export type MMVaultRebalanceParams = GetAbiFunctionParamsTypes<
  typeof ApertureMMVault__factory.abi,
  'rebalance'
>[0];