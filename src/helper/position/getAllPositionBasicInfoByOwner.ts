import { ApertureSupportedChainId } from '@/index';
import { Provider } from '@ethersproject/providers';
import { BigNumber } from 'ethers';

import { getBasicPositionInfo } from './getBasicPositionInfo';
import { getNPM } from './position';
import { BasicPositionInfo } from './types';

/**
 * Fetches basic info for all positions of the specified owner.
 * @param owner The owner.
 * @param chainId Chain id.
 * @param provider Ethers provider.
 * @returns A map where each key is a position id and its associated value is BasicPositionInfo of that position.
 */
export async function getAllPositionBasicInfoByOwner(
  owner: string,
  chainId: ApertureSupportedChainId,
  provider: Provider,
): Promise<Map<string, BasicPositionInfo>> {
  const positionIds = await getPositionIdsByOwner(owner, chainId, provider);
  const positionInfos = await Promise.all(
    positionIds.map((positionId) =>
      getBasicPositionInfo(chainId, positionId, provider),
    ),
  );
  return new Map(
    positionIds.map((positionId, index) => [
      positionId.toString(),
      positionInfos[index],
    ]),
  );
}

/**
 * Lists all position ids owned by the specified owner.
 * @param owner The owner.
 * @param chainId Chain id.
 * @param provider Ethers provider.
 * @returns List of all position ids of the specified owner.
 */
export async function getPositionIdsByOwner(
  owner: string,
  chainId: ApertureSupportedChainId,
  provider: Provider,
): Promise<BigNumber[]> {
  const npm = getNPM(chainId, provider);
  const numPositions = (await npm.balanceOf(owner)).toNumber();
  return Promise.all(
    [...Array(numPositions).keys()].map((index) =>
      npm.tokenOfOwnerByIndex(owner, index),
    ),
  );
}
