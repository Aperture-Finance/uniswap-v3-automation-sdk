import { ApertureSupportedChainId } from '@/index';
import { BlockTag, Provider } from '@ethersproject/providers';
import { Position } from '@uniswap/v3-sdk';
import { BigNumberish } from 'ethers';

import { getPool, getPoolFromBasicPositionInfo } from '../pool';
import { getNPM } from './position';
import { BasicPositionInfo } from './types';

export async function getPositionFromBasicInfo(
  basicInfo: BasicPositionInfo,
  chainId: ApertureSupportedChainId,
  provider: Provider,
): Promise<Position> {
  if (basicInfo.liquidity === undefined) {
    throw 'Missing position liquidity info';
  }
  return new Position({
    pool: await getPoolFromBasicPositionInfo(basicInfo, chainId, provider),
    liquidity: basicInfo.liquidity,
    tickLower: basicInfo.tickLower,
    tickUpper: basicInfo.tickUpper,
  });
}

/**
 * Get the Uniswap `Position` object for the specified position id.
 * @param chainId The chain ID.
 * @param positionId The position id.
 * @param provider The ethers provider.
 * @param blockTag Optional block tag to query.
 * @returns The `Position` object.
 */
export async function getPosition(
  chainId: ApertureSupportedChainId,
  positionId: BigNumberish,
  provider: Provider,
  blockTag?: BlockTag,
) {
  const npm = getNPM(chainId, provider);
  const positionInfo = await npm.positions(positionId, { blockTag });
  const pool = await getPool(
    positionInfo.token0,
    positionInfo.token1,
    positionInfo.fee,
    chainId,
    provider,
    blockTag,
  );
  return new Position({
    pool,
    liquidity: positionInfo.liquidity.toString(),
    tickLower: positionInfo.tickLower,
    tickUpper: positionInfo.tickUpper,
  });
}
