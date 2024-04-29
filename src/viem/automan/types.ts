import {
  Automan__factory,
  INonfungiblePositionManager__factory,
} from '@/index';
import {
  AbiStateMutability,
  Address,
  ContractFunctionArgs,
  ContractFunctionReturnType,
} from 'viem';

import { SwapRoute } from '../aggregator';
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

export type MintParams = GetAbiFunctionParamsTypes<
  typeof INonfungiblePositionManager__factory.abi,
  'mint'
>[0];

export type IncreaseLiquidityParams = GetAbiFunctionParamsTypes<
  typeof INonfungiblePositionManager__factory.abi,
  'increaseLiquidity'
>[0];

export type SwapPath = {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  amountOut: string;
  minAmountOut: string;
};

export type SwapInfo = {
  swapRoute?: SwapRoute;
  swapPath: SwapPath;
  priceImpact: Big.Big;
};
