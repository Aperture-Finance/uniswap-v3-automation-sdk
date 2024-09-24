import {
  AutomanV3__factory,
  Automan__factory,
  ICommonNonfungiblePositionManager__factory,
  ISlipStreamNonfungiblePositionManager__factory,
  IUniswapV3NonfungiblePositionManager__factory,
} from '@/index';
import {
  AbiStateMutability,
  ContractFunctionArgs,
  ContractFunctionReturnType,
  Hex,
} from 'viem';

import { GetAbiFunctionParamsTypes } from '../generics';

export type AutomanActionName =
  | 'mintOptimal'
  | 'increaseLiquidityOptimal'
  | 'decreaseLiquidity'
  | 'reinvest'
  | 'rebalance'
  | 'removeLiquidity';

export type GetAutomanParams<T extends AutomanActionName> =
  GetAbiFunctionParamsTypes<typeof Automan__factory.abi, T>;
export type GetAutomanV3Params<T extends AutomanActionName> =
  GetAbiFunctionParamsTypes<typeof AutomanV3__factory.abi, T>;

export type GetAutomanReturnTypes<
  functionName extends AutomanActionName,
  args extends ContractFunctionArgs<
    typeof Automan__factory.abi,
    AbiStateMutability,
    functionName
  > = ContractFunctionArgs<
    typeof Automan__factory.abi,
    AbiStateMutability,
    functionName
  >,
> = ContractFunctionReturnType<
  typeof Automan__factory.abi,
  AbiStateMutability,
  functionName,
  args // to dedup function name
>;
export type GetAutomanReturnTypesV3<
  functionName extends AutomanActionName,
  args extends ContractFunctionArgs<
    typeof AutomanV3__factory.abi,
    AbiStateMutability,
    functionName
  > = ContractFunctionArgs<
    typeof AutomanV3__factory.abi,
    AbiStateMutability,
    functionName
  >,
> = ContractFunctionReturnType<
  typeof AutomanV3__factory.abi,
  AbiStateMutability,
  functionName,
  args // to dedup function name
>;

export type UniV3MintParams = GetAbiFunctionParamsTypes<
  typeof IUniswapV3NonfungiblePositionManager__factory.abi,
  'mint'
>[0];

export type SlipStreamMintParams = GetAbiFunctionParamsTypes<
  typeof ISlipStreamNonfungiblePositionManager__factory.abi,
  'mint'
>[0];

export type IncreaseLiquidityParams = GetAbiFunctionParamsTypes<
  typeof ICommonNonfungiblePositionManager__factory.abi,
  'increaseLiquidity'
>[0];

export type RebalanceReturnType = GetAutomanReturnTypes<
  'rebalance',
  [UniV3MintParams, bigint, bigint, Hex]
>;
export type RebalanceReturnTypeV3 = GetAutomanReturnTypesV3<
  'rebalance',
  [UniV3MintParams, bigint, bigint, bigint, Hex]
>;

export type ReinvestReturnType = GetAutomanReturnTypes<
  'reinvest',
  [IncreaseLiquidityParams, bigint, Hex]
>;
export type ReinvestReturnTypeV3 = GetAutomanReturnTypesV3<
  'reinvest',
  [IncreaseLiquidityParams, bigint, bigint, Hex]
>;

export type MintReturnType = GetAutomanReturnTypes<'mintOptimal'>;

export type IncreaseLiquidityReturnType =
  GetAutomanReturnTypes<'increaseLiquidityOptimal'>;

export type RemoveLiquidityReturnType = GetAutomanReturnTypes<
  'removeLiquidity',
  [DecreaseLiquidityParams, bigint]
>;
export type RemoveLiquidityReturnTypeV3 = GetAutomanReturnTypesV3<
  'removeLiquidity',
  [DecreaseLiquidityParams, bigint, bigint]
>;

export type DecreaseLiquidityParams = GetAbiFunctionParamsTypes<
  typeof ICommonNonfungiblePositionManager__factory.abi,
  'decreaseLiquidity'
>[0];
