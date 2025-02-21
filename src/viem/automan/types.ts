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
  | 'mint'
  | 'mintOptimal'
  | 'increaseLiquidity'
  | 'increaseLiquidityOptimal'
  | 'decreaseLiquidity'
  | 'decreaseLiquiditySingle'
  | 'reinvest'
  | 'rebalance'
  | 'removeLiquidity';
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
// Helpers for AutomanV4 not implemented because
// AutomanV1 often has the same params/return types.

/* IAutomanCommon */
export type CollectConfigParams = GetAbiFunctionParamsTypes<
  typeof AutomanV4__factory.abi,
  'decreaseLiquidity'
>[1];
export type PermitParams = Exclude<
  GetAbiFunctionParamsTypes<
    typeof AutomanV4__factory.abi,
    'decreaseLiquidity'
  >[2],
  undefined
>;

/* Mint */
// { token0:Address, token1:Address, fee:number, tickLower:number, tickUpper:number, amount0Desired:bigint, amount1Desired:bigint, amount0Min:bigint, amount1Min:bigint, recipient:Address, deadline:bigint }
export type UniV3MintParams = GetAbiFunctionParamsTypes<
  typeof IUniswapV3NonfungiblePositionManager__factory.abi,
  'mint'
>[0];
// { token0:Address, token1:Address, tickSpacing:number, tickLower:number, tickUpper:number, amount0Desired:bigint, amount1Desired:bigint, amount0Min:bigint, amount1Min:bigint, recipient:Address, deadline:bigint, sqrtPriceX96:bigint }
export type SlipStreamMintParams = GetAbiFunctionParamsTypes<
  typeof ISlipStreamNonfungiblePositionManager__factory.abi,
  'mint'
>[0];
// [bigint tokenId, bigint liquidity, bigint amount0, bigint amount1]
export type MintReturnType = GetAutomanReturnTypes<'mint'>;

/* IncreaseLiquidity */
// { tokenId:bigint, amount0Desired:bigint, amount1Desired:bigint, amount0Min:bigint, amount1Min:bigint, deadline:bigint }
export type IncreaseLiquidityParams = GetAbiFunctionParamsTypes<
  typeof ICommonNonfungiblePositionManager__factory.abi,
  'increaseLiquidity'
>[0];
// [bigint liquidity, bigint amount0, bigint amount1]
export type IncreaseLiquidityReturnType =
  GetAutomanReturnTypes<'increaseLiquidity'>;

/* Reinvest */
// [bigint liquidity, bigint amount0, bigint amount1]
export type ReinvestReturnType = GetAutomanReturnTypes<
  'reinvest',
  [IncreaseLiquidityParams, bigint, Hex]
>;

/* Decrease Liquidity */
// { tokenId:bigint, liquidity:bigint, amount0Min:bigint, amount1Min:bigint, deadline:bigint }
export type DecreaseLiquidityParams = GetAbiFunctionParamsTypes<
  typeof ICommonNonfungiblePositionManager__factory.abi,
  'decreaseLiquidity'
>[0];
// [ amount0:bigint, amount1:bigint ]
export type DecreaseLiquidityReturnType = GetAutomanReturnTypes<
  'decreaseLiquidity',
  [DecreaseLiquidityParams, bigint]
>;

/* Rebalance */
// [ tokenId:bigint, liquidity:bigint, amount0:bigint, amount1:bigint ]
export type RebalanceReturnType = GetAutomanReturnTypes<
  'rebalance',
  [UniV3MintParams, bigint, bigint, Hex]
>;
