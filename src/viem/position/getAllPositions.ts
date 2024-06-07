import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { viem } from 'aperture-lens';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

import { getPublicClient } from '../public_client';
import { PositionStateArray, getPositionsState } from './getPositionState';
import { getTokenIds } from './getTokenIds';
import { PositionDetails, getNPM } from './position';

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
    const numPositions = await npm.read.balanceOf([owner], {
      blockNumber,
    });
    return Number(numPositions);
  } catch (error) {
    console.warn(`Failed to getPositionsNumber on ${amm}-${chainId}`, error);
    return 0;
  }
}
