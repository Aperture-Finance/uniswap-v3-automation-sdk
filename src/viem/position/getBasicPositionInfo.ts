import { ApertureSupportedChainId } from '@/index';
import { PublicClient } from 'viem';

import { getToken } from '../currency';
import { getPublicClient } from '../public_client';
import { BasicPositionInfo, getNPM } from './position';

export async function getBasicPositionInfo(
  chainId: ApertureSupportedChainId,
  positionId: bigint,
  publicClient?: PublicClient,
  blockNumber?: bigint,
): Promise<BasicPositionInfo> {
  publicClient = publicClient ?? getPublicClient(chainId);
  const [, , token0Addr, token1Addr, fee, tickLower, tickUpper, liquidity] =
    await getNPM(chainId, publicClient).read.positions([positionId], {
      blockNumber,
    });
  const [token0, token1] = await Promise.all([
    getToken(token0Addr, chainId, publicClient, blockNumber),
    getToken(token1Addr, chainId, publicClient, blockNumber),
  ]);
  return {
    token0,
    token1,
    fee,
    tickLower,
    tickUpper,
    liquidity: liquidity.toString(),
  };
}
