import { ApertureSupportedChainId } from '@/index';
import { BlockTag, Provider } from '@ethersproject/providers';
import { BigNumberish } from 'ethers';

import { getToken } from '../currency';
import { getNPM } from './getNPM';
import { BasicPositionInfo } from './types';

export async function getBasicPositionInfo(
  chainId: ApertureSupportedChainId,
  positionId: BigNumberish,
  provider: Provider,
  blockTag?: BlockTag,
): Promise<BasicPositionInfo> {
  const npm = getNPM(chainId, provider);
  const overrides = { blockTag };
  const positionInfo = await npm.positions(positionId, overrides);
  const [token0, token1] = await Promise.all([
    getToken(positionInfo.token0, chainId, provider, blockTag),
    getToken(positionInfo.token1, chainId, provider, blockTag),
  ]);
  return {
    token0,
    token1,
    fee: positionInfo.fee,
    tickLower: positionInfo.tickLower,
    tickUpper: positionInfo.tickUpper,
    liquidity: positionInfo.liquidity.toString(),
  };
}
