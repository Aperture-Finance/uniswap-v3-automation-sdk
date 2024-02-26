import {
  INonfungiblePositionManager__factory,
  UniV3Automan__factory,
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
  GetAbiFunctionParamsTypes<typeof UniV3Automan__factory.abi, T>;

export type GetAutomanReturnTypes<
  functionName extends AutomanActionName,
  args extends ContractFunctionArgs<
    typeof UniV3Automan__factory.abi,
    AbiStateMutability,
    functionName
  > = ContractFunctionArgs<
    typeof UniV3Automan__factory.abi,
    AbiStateMutability,
    functionName
  >,
> = ContractFunctionReturnType<
  typeof UniV3Automan__factory.abi,
  AbiStateMutability,
  functionName,
  args // to dedup function name
>;

export type MintParams = GetAbiFunctionParamsTypes<
  typeof INonfungiblePositionManager__factory.abi,
  'mint'
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
