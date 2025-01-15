import {
  AutomanV4__factory,
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
  | 'decreaseLiquiditySingle'
  | 'reinvest'
  | 'rebalance'
  | 'removeLiquidity';

export type GetAutomanParams<T extends AutomanActionName> =
  GetAbiFunctionParamsTypes<typeof Automan__factory.abi, T>;
export type GetAutomanV4Params<T extends AutomanActionName> =
  GetAbiFunctionParamsTypes<typeof AutomanV4__factory.abi, T>;

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

export type GetAutomanV4ReturnTypes<
  functionName extends AutomanActionName,
  args extends ContractFunctionArgs<
    typeof AutomanV4__factory.abi,
    AbiStateMutability,
    functionName
  > = ContractFunctionArgs<
    typeof AutomanV4__factory.abi,
    AbiStateMutability,
    functionName
  >,
> = ContractFunctionReturnType<
  typeof AutomanV4__factory.abi,
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

export type ReinvestReturnType = GetAutomanReturnTypes<
  'reinvest',
  [IncreaseLiquidityParams, bigint, Hex]
>;

export type MintReturnType = GetAutomanReturnTypes<'mintOptimal'>;

export type IncreaseLiquidityReturnType =
  GetAutomanReturnTypes<'increaseLiquidityOptimal'>;

export type RemoveLiquidityReturnType = GetAutomanReturnTypes<
  'removeLiquidity',
  [DecreaseLiquidityParams, bigint]
>;

export type DecreaseLiquidityParams = GetAbiFunctionParamsTypes<
  typeof ICommonNonfungiblePositionManager__factory.abi,
  'decreaseLiquidity'
>[0];

export type DecreaseLiquidityReturnType = GetAutomanV4ReturnTypes<
  'decreaseLiquidity',
  [DecreaseLiquidityParams, bigint, bigint]
>;

export type DecreaseLiquiditySingleReturnType = GetAutomanV4ReturnTypes<
  'decreaseLiquiditySingle',
  [DecreaseLiquidityParams, boolean, bigint, bigint, Hex]
>;
