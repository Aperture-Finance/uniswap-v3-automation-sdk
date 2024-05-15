import { INonfungiblePositionManager__factory } from '@/index';
import { Address } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import { GetAbiFunctionParamsTypes } from '../generics';
import { GetAutomanReturnTypes } from './types';

export type DecreaseLiquidityParams = GetAbiFunctionParamsTypes<
  typeof INonfungiblePositionManager__factory.abi,
  'decreaseLiquidity'
>[0];

export type MintReturnType = GetAutomanReturnTypes<'mintOptimal'>;

export type IncreaseLiquidityReturnType =
  GetAutomanReturnTypes<'increaseLiquidityOptimal'>;

export type RemoveLiquidityReturnType = GetAutomanReturnTypes<
  'removeLiquidity',
  [DecreaseLiquidityParams, bigint]
>;

export function getFromAddress(from?: Address) {
  if (from === undefined) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    from = account.address;
  }
  return from;
}
