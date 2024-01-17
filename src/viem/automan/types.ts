import { UniV3Automan__factory } from '@/index';
import { AbiStateMutability, ContractFunctionReturnType } from 'viem';

import { GetAbiFunctionParamsTypes } from '../generics';

export type AutomanActionName =
  | 'mintOptimal'
  | 'decreaseLiquidity'
  | 'reinvest'
  | 'rebalance'
  | 'removeLiquidity';

export type GetAutomanParams<T extends AutomanActionName> =
  GetAbiFunctionParamsTypes<typeof UniV3Automan__factory.abi, T>;

export type GetAutomanReturnTypes<TFunctionName extends AutomanActionName> =
  ContractFunctionReturnType<
    typeof UniV3Automan__factory.abi,
    AbiStateMutability,
    TFunctionName
  >;
