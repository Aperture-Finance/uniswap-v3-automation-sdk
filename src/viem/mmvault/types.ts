import { ApertureMMVault__factory, IApertureMMVault__factory } from '@/index';
import {
  AbiStateMutability,
  ContractFunctionArgs,
  ContractFunctionReturnType,
} from 'viem';

import { GetAbiFunctionParamsTypes } from '../generics';

export type MMVaultActionName = 'deposit' | 'withdraw' | 'rebalance';

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

export type MMVaultRebalanceParams = GetAbiFunctionParamsTypes<
  typeof IApertureMMVault__factory.abi,
  'rebalance'
>[0];

export type MMVaultRebalanceReturnType = GetMMVaultReturnTypes<
  'rebalance',
  [MMVaultRebalanceParams, bigint, bigint, bigint]
>;
