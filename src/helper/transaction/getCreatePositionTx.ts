import { ApertureSupportedChainId, getChainInfo } from '@/index';
import { Provider, TransactionRequest } from '@ethersproject/providers';
import {
  MintOptions,
  NonfungiblePositionManager,
  Position,
} from '@uniswap/v3-sdk';

import { getPool } from '../pool';
import { getTxToNonfungiblePositionManager } from './internal';

/**
 * Generates an unsigned transaction that creates a position as specified.
 * @param position The position to create.
 * @param options Options.
 * @param chainId Chain id.
 * @param provider Ethers provider.
 * @returns The unsigned tx.
 */
export async function getCreatePositionTx(
  position: Position,
  options: Omit<MintOptions, 'createPool'>,
  chainId: ApertureSupportedChainId,
  provider: Provider,
): Promise<TransactionRequest> {
  let createPool = false;
  try {
    await getPool(
      position.pool.token0,
      position.pool.token1,
      position.pool.fee,
      chainId,
      provider,
    );
  } catch (e) {
    createPool = true;
  }
  const { calldata, value } = NonfungiblePositionManager.addCallParameters(
    position,
    {
      ...options,
      createPool,
    },
  );
  return getTxToNonfungiblePositionManager(
    getChainInfo(chainId),
    calldata,
    value,
  );
}
