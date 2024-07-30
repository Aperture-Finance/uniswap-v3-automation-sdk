import { ApertureSupportedChainId } from '@/index';
import { EphemeralAllPositionsByOwner__factory, viem } from 'aperture-lens';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import {
  AbiStateMutability,
  ContractFunctionReturnType,
  PublicClient,
} from 'viem';

import { getPublicClient } from '../public_client';
import { waitForMs } from './internal';
import { getNPM } from './position';

export type PositionStateArray = ContractFunctionReturnType<
  typeof EphemeralAllPositionsByOwner__factory.abi,
  AbiStateMutability,
  'allPositions'
>;

const FETCH_TIMEOUT = 500;
const DEFAULT_CHAIN_BATCH_SIZE = 1000;

// rpc node may has different limit on content length
const CHAIN_BATCH_SIZE: Partial<Record<ApertureSupportedChainId, number>> = {
  [ApertureSupportedChainId.POLYGON_MAINNET_CHAIN_ID]: 120,
};

/**
 * Get positions state
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param tokenIds Token ids owned by the owner.
 * @param publicClient Viem public client.
 * @param blockNumber Optional block number to query.
 * @param timeout Optional delay time between promises.
 * @param maxRetry Optional maximum retry times.
 * @returns Position state array.
 */
export async function getPositionsState(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  tokenIds: bigint[],
  publicClient?: PublicClient,
  blockNumber?: bigint,
  timeout = FETCH_TIMEOUT,
  maxRetry = 3,
): Promise<PositionStateArray> {
  if (!tokenIds.length) {
    return [];
  }

  const batchSize = CHAIN_BATCH_SIZE[chainId] ?? DEFAULT_CHAIN_BATCH_SIZE;

  publicClient = publicClient ?? getPublicClient(chainId);
  let positions: PositionStateArray = [];
  let retryTimes = 0;
  const npm = getNPM(chainId, amm, publicClient);

  for (let i = 0; i < tokenIds.length && retryTimes < maxRetry; ) {
    if (i > 0) {
      await waitForMs(timeout);
    }
    const currentBatch = tokenIds.slice(i, i + batchSize);

    try {
      const currentPositions = await viem.getPositions(
        amm,
        npm.address,
        currentBatch,
        publicClient,
        blockNumber,
      );

      positions = positions.concat(currentPositions);
      i += batchSize;
    } catch (error) {
      retryTimes++;
      waitForMs(timeout * 5);
      console.warn(
        `Failed to getPositions on ${amm}-${chainId}, retrying...`,
        currentBatch,
        error,
      );
    }
  }

  if (retryTimes >= maxRetry) {
    console.error(
      `Failed to getPositions on ${amm}-${chainId} after ${maxRetry} retries`,
    );
    return [];
  }

  return positions;
}
