import { ApertureSupportedChainId } from '@/index';
import { EphemeralAllPositionsByOwner__factory, viem } from 'aperture-lens';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { chunk, flatten } from 'lodash';
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
const BATCH_FETCH_POSITION_SIZE = 1000;

/**
 * Get positions state
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param tokenIds Token ids owned by the owner.
 * @param publicClient Viem public client.
 * @param blockNumber Optional block number to query.
 * @param timeout Optional delay time between promises.
 * @param batchSize Optional batch size to fetch.
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
  publicClient = publicClient ?? getPublicClient(chainId);
  let positions: PositionStateArray = [];
  let retryTimes = 0;
  const npm = getNPM(chainId, amm, publicClient);

  const batchSize = BATCH_FETCH_POSITION_SIZE;
  for (let i = 0; i < tokenIds.length && retryTimes < maxRetry; ) {
    if (i > 0) {
      await waitForMs(timeout);
    }
    const currentBatch = tokenIds.slice(i, i + batchSize);

    try {
      // Fetch position state.
      const currentPositions = flatten(
        await Promise.all(
          chunk(currentBatch, BATCH_FETCH_POSITION_SIZE).map(
            async (tokenIdsChunk) => {
              try {
                return viem.getPositions(
                  npm.address,
                  tokenIdsChunk,
                  publicClient,
                  blockNumber,
                );
              } catch (error) {
                console.warn(
                  `Failed to getPositions on ${amm}-${chainId}`,
                  tokenIdsChunk,
                  error,
                );
                return [];
              }
            },
          ),
        ),
      );
      positions = positions.concat(currentPositions);
      i += batchSize;
    } catch (error) {
      retryTimes++;
      waitForMs(timeout * 5);
      console.warn(
        `Failed to getPositions on ${amm}-${chainId}`,
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
