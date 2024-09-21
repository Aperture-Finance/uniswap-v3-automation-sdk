import {
  Automan__factory,
  Automan__factoryV2,
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
export type GetAutomanV2Params<T extends AutomanActionName> =
  GetAbiFunctionParamsTypes<typeof Automan__factoryV2.abi, T>;

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
export type GetAutomanReturnTypesV2<
  functionName extends AutomanActionName,
  args extends ContractFunctionArgs<
    typeof Automan__factoryV2.abi,
    AbiStateMutability,
    functionName
  > = ContractFunctionArgs<
    typeof Automan__factoryV2.abi,
    AbiStateMutability,
    functionName
  >,
> = ContractFunctionReturnType<
  typeof Automan__factoryV2.abi,
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
export type RebalanceReturnTypeV2 = GetAutomanReturnTypesV2<
  'rebalance',
  [UniV3MintParams, bigint, bigint, bigint, Hex]
>;

export type ReinvestReturnType = GetAutomanReturnTypes<
  'reinvest',
  [IncreaseLiquidityParams, bigint, Hex]
>;
export type ReinvestReturnTypeV2 = GetAutomanReturnTypesV2<
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
export type RemoveLiquidityReturnTypeV2 = GetAutomanReturnTypesV2<
  'removeLiquidity',
  [DecreaseLiquidityParams, bigint, bigint]
>;

export type DecreaseLiquidityParams = GetAbiFunctionParamsTypes<
  typeof ICommonNonfungiblePositionManager__factory.abi,
  'decreaseLiquidity'
>[0];
