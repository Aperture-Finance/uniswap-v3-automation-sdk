import { ApertureSupportedChainId } from '@/index';
import { Position } from '@aperture_finance/uniswap-v3-sdk';
import { BlockTag, Provider } from '@ethersproject/providers';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { BigNumberish } from 'ethers';

import { getPool, getPoolFromBasicPositionInfo } from '../pool';
import { getNPM } from './position';
import { BasicPositionInfo } from './types';

export async function getPositionFromBasicInfo(
  basicInfo: BasicPositionInfo,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  provider: Provider,
): Promise<Position> {
  if (basicInfo.liquidity === undefined) {
    throw 'Missing position liquidity info';
  }
  return new Position({
    pool: await getPoolFromBasicPositionInfo(basicInfo, chainId, amm, provider),
    liquidity: basicInfo.liquidity,
    tickLower: basicInfo.tickLower,
    tickUpper: basicInfo.tickUpper,
  });
}

/**
 * Get the Uniswap `Position` object for the specified position id.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param positionId The position id.
 * @param provider The ethers provider.
 * @param blockTag Optional block tag to query.
 * @returns The `Position` object.
 */
export async function getPosition(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  positionId: BigNumberish,
  provider: Provider,
  blockTag?: BlockTag,
) {
  const npm = getNPM(chainId, amm, provider);
  const positionInfo = await npm.positions(positionId, { blockTag });
  const pool = await getPool(
    positionInfo.token0,
    positionInfo.token1,
    positionInfo.fee,
    chainId,
    amm,
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
