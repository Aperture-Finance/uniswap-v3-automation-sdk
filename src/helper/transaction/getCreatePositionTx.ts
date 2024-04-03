import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import {
  MintOptions,
  NonfungiblePositionManager,
  Position,
} from '@aperture_finance/uniswap-v3-sdk';
import { Provider, TransactionRequest } from '@ethersproject/providers';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';

import { getPool } from '../pool';
import { getTxToNonfungiblePositionManager } from './transaction';

/**
 * Generates an unsigned transaction that creates a position as specified.
 * @param position The position to create.
 * @param options Options.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param provider Ethers provider.
 * @returns The unsigned tx.
 */
export async function getCreatePositionTx(
  position: Position,
  options: Omit<MintOptions, 'createPool'>,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  provider: Provider,
): Promise<TransactionRequest> {
  let createPool = false;
  try {
    await getPool(
      position.pool.token0,
      position.pool.token1,
      position.pool.fee,
      chainId,
      amm,
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
    getAMMInfo(chainId, amm)!,
    calldata,
    value,
  );
}
