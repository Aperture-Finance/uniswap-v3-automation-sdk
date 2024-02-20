import { INonfungiblePositionManager__factory } from '@/index';
import { Address, Hex } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import { GetAbiFunctionParamsTypes } from '../generics';
import { GetAutomanReturnTypes, MintParams } from './types';

export type DecreaseLiquidityParams = GetAbiFunctionParamsTypes<
  typeof INonfungiblePositionManager__factory.abi,
  'decreaseLiquidity'
>[0];

export type IncreaseLiquidityParams = GetAbiFunctionParamsTypes<
  typeof INonfungiblePositionManager__factory.abi,
  'increaseLiquidity'
>[0];

export type MintReturnType = GetAutomanReturnTypes<'mintOptimal'>;

export type IncreaseLiquidityReturnType =
  GetAutomanReturnTypes<'increaseLiquidityOptimal'>;

export type RemoveLiquidityReturnType = GetAutomanReturnTypes<
  'removeLiquidity',
  [DecreaseLiquidityParams, bigint]
>;

export type RebalanceReturnType = GetAutomanReturnTypes<
  'rebalance',
  [MintParams, bigint, bigint, Hex]
>;

export function getFromAddress(from?: Address) {
  if (from === undefined) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    from = account.address;
  }
  return from;
}
