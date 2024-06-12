import { ApertureSupportedChainId } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

import { getPublicClient } from '../public_client';
import { waitForMs } from './internal';
import { getNPM } from './position';

const FETCH_TIMEOUT = 200;
const BATCH_TOKEN_ID_SIZE = 2000;
const MULTICALL_BATCH_SIZE = 102_400;

/**
 * Get the token ids owned by the owner.
 * @param owner The owner.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param numPositions Positions number.
 * @param publicClient Viem public client.
 * @param blockNumber Optional block number to query.
 * @param timeout Optional delay time between promises.
 * @param batchSize Optional batch size of positions to fetch.
 * @returns Token ids owned by the owner.
 */
export async function getTokenIds(
  owner: Address,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  numPositions: number,
  publicClient?: PublicClient,
  blockNumber?: bigint,
  timeout = FETCH_TIMEOUT,
  batchSize = BATCH_TOKEN_ID_SIZE,
  maxRetry = 3,
): Promise<bigint[]> {
  publicClient = publicClient ?? getPublicClient(chainId);
  const npm = getNPM(chainId, amm, publicClient);

  const getCurrentBatchContracts = (startIdx: number) => {
    const currentBatch = [];
    for (let i = startIdx; i < startIdx + batchSize; i++) {
      if (i < numPositions) {
        currentBatch.push({
          address: npm.address,
          abi: npm.abi,
          functionName: 'tokenOfOwnerByIndex',
          args: [owner, BigInt(i)],
          blockNumber,
        });
      }
    }
    return currentBatch;
  };

  let retryTimes = 0;
  let tokenIds: bigint[] = [];

  for (let i = 0; i < numPositions && retryTimes < maxRetry; ) {
    if (i > 0) {
      await waitForMs(timeout);
    }

    try {
      const currentTokenIds = (
        await publicClient.multicall({
          contracts: getCurrentBatchContracts(i),
          allowFailure: false,
          batchSize: MULTICALL_BATCH_SIZE,
        })
      ).map((id) => BigInt(id ?? 0));
      tokenIds = tokenIds.concat(currentTokenIds);
      i += batchSize;
    } catch (error) {
      console.warn(
        `Failed to getTokenIds on ${amm}-${chainId} from ${i} to ${i + batchSize}`,
        error,
      );

      retryTimes++;
      await waitForMs(timeout * 5);
    }
  }

  if (retryTimes >= maxRetry) {
    console.error(
      `Failed to getTokenIds on ${amm}-${chainId} after ${maxRetry} retries`,
    );
    return [];
  }

  return tokenIds;
}
