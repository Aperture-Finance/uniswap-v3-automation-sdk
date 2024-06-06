import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { EphemeralAllPositionsByOwner__factory, viem } from 'aperture-lens';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { chunk, flatten } from 'lodash';
import {
  AbiStateMutability,
  Address,
  ContractFunctionReturnType,
  PublicClient,
} from 'viem';

import { getPublicClient } from '../public_client';
import { PositionDetails, getNPM } from './position';

type PositionStateArray = ContractFunctionReturnType<
  typeof EphemeralAllPositionsByOwner__factory.abi,
  AbiStateMutability,
  'allPositions'
>;

/**
 * Get the state and pool for all positions of the specified owner by deploying an ephemeral contract via `eth_call`.
 * Each position consumes about 200k gas, so this method may fail if the number of positions exceeds 1500 assuming the
 * provider gas limit is 300m.
 * @param owner The owner.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param publicClient Viem public client.
 * @param blockNumber Optional block number to query.
 * @returns A map where each key is a position id and its associated value is PositionDetails of that position.
 */
export async function getAllPositions(
  owner: Address,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient?: PublicClient,
  blockNumber?: bigint,
): Promise<Map<string, PositionDetails>> {
  let positions: PositionStateArray = [];
  publicClient = publicClient ?? getPublicClient(chainId);
  try {
    positions = await viem.getAllPositionsByOwner(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      owner,
      publicClient,
      blockNumber,
    );
  } catch (e) {
    // const error = e as CallExecutionErrorType;
    // The error.details maybe like 'out of gas' or 'execution reverted', fallback to the following logic:
    //   - Get the number of positions owned by the owner.
    //   - Batch fetch token ids.
    //   - Batch fetch position details using token ids.
    const numPositions = await getNumberOfPositionsOwnedByOwner(
      owner,
      chainId,
      amm,
      publicClient,
      blockNumber,
    );
    const tokenIds = await getTokenIds(
      owner,
      chainId,
      amm,
      numPositions,
      publicClient,
      blockNumber,
    );
    positions = await getPositionsState(
      chainId,
      amm,
      tokenIds,
      publicClient,
      blockNumber,
    );
  }

  return new Map(
    positions.map(
      (pos) =>
        [
          pos.tokenId.toString(),
          PositionDetails.fromPositionStateStruct(chainId, pos),
        ] as const,
    ),
  );
}

/**
 * Get the number of positions owned by the owner.
 * @param owner The owner.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param publicClient Viem public client.
 * @param blockNumber Optional block number to query.
 * @returns The number of positions owned by the owner.
 */
export async function getNumberOfPositionsOwnedByOwner(
  owner: Address,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient?: PublicClient,
  blockNumber?: bigint,
): Promise<number> {
  publicClient = publicClient ?? getPublicClient(chainId);
  const npm = getNPM(chainId, amm, publicClient);
  try {
    const numPositions: bigint = await npm.read.balanceOf([owner], {
      blockNumber,
    });
    return Number(numPositions);
  } catch (error) {
    console.warn(`Failed to getPositionsNumber on ${amm}-${chainId}`, error);
    return 0;
  }
}

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
  timeout?: number,
  batchSize?: number,
): Promise<bigint[]> {
  publicClient = publicClient ?? getPublicClient(chainId);
  const npm = getNPM(chainId, amm, publicClient);
  batchSize = batchSize ?? 10_000;
  timeout = timeout ?? 5_000;
  let tokenIds: bigint[] = [];
  const tokenIdsArray = [...Array(numPositions).keys()];
  for (let i = 0; i < numPositions; i += batchSize) {
    const currentBatch = tokenIdsArray.slice(i, i + batchSize);
    let currentTokenIds: bigint[] = [];
    try {
      currentTokenIds = (
        await publicClient.multicall({
          contracts: currentBatch.map((i) => {
            return {
              address: npm.address,
              abi: npm.abi,
              functionName: 'tokenOfOwnerByIndex',
              args: [owner, BigInt(i)],
              blockNumber,
            };
          }),
          allowFailure: false,
          batchSize: 102_400,
        })
      ).map((i) => BigInt(i ?? 0));
      tokenIds = tokenIds.concat(currentTokenIds);
    } catch (error) {
      console.warn(
        `Failed to getTokenIds on ${amm}-${chainId} from ${i} to ${i + batchSize}`,
        error,
      );
    }

    if (currentTokenIds.length && i + batchSize < numPositions) {
      await new Promise((resolve) => setTimeout(resolve, timeout));
    }
  }

  return tokenIds;
}

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
  timeout?: number,
  batchSize?: number,
): Promise<PositionStateArray> {
  publicClient = publicClient ?? getPublicClient(chainId);
  batchSize = batchSize ?? 10_000;
  timeout = timeout ?? 5_000;
  let positions: PositionStateArray = [];
  const npm = getNPM(chainId, amm, publicClient);
  if (tokenIds.length) {
    for (let i = 0; i < tokenIds.length; i += batchSize) {
      let currentPositions: PositionStateArray = [];
      const currentBatch = tokenIds.slice(i, i + batchSize);

      // Fetch position state.
      currentPositions = flatten(
        await Promise.all(
          chunk(currentBatch, 500).map((tokenIdsChunk) => {
            try {
              return viem.getPositions(
                npm.address,
                tokenIdsChunk,
                publicClient!,
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
          }),
        ),
      );
      positions = positions.concat(currentPositions);

      if (currentPositions.length && i + batchSize < tokenIds.length) {
        await new Promise((resolve) => setTimeout(resolve, timeout));
      }
    }
  }

  return positions;
}
