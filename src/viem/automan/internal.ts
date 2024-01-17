import { INonfungiblePositionManager__factory } from '@/index';
import { Address } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import { GetAutomanReturnTypes } from '.';
import { GetAbiFunctionParamsTypes } from '../generics';

export type DecreaseLiquidityParams = GetAbiFunctionParamsTypes<
  typeof INonfungiblePositionManager__factory.abi,
  'decreaseLiquidity'
>[0];

export type IncreaseLiquidityParams = GetAbiFunctionParamsTypes<
  typeof INonfungiblePositionManager__factory.abi,
  'increaseLiquidity'
>[0];

export type MintParams = GetAbiFunctionParamsTypes<
  typeof INonfungiblePositionManager__factory.abi,
  'mint'
>[0];

export type MintReturnType = GetAutomanReturnTypes<'mintOptimal'>;

export type RemoveLiquidityReturnType =
  GetAutomanReturnTypes<'removeLiquidity'>;

export type RebalanceReturnType = GetAutomanReturnTypes<'rebalance'>;

export function getFromAddress(from?: Address) {
  if (from === undefined) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    from = account.address;
  }
  return from;
}