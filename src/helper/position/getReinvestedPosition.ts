import {
  ApertureSupportedChainId,
  IAutoman__factory,
  getAMMInfo,
} from '@/index';
import { JsonRpcProvider } from '@ethersproject/providers';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { BigNumber, BigNumberish } from 'ethers';

import { getAutomanReinvestCallInfo } from '../automan';
import { getNPMApprovalOverrides, staticCallWithOverrides } from '../overrides';
import { getNPM } from './position';

/**
 * Predict the change in liquidity and token amounts after a reinvestment without a prior approval.
 * https://github.com/dragonfly-xyz/useful-solidity-patterns/blob/main/patterns/eth_call-tricks/README.md#geth-overrides
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param positionId The position id.
 * @param provider The ethers provider.
 * @param blockNumber Optional block number to query.
 * @returns The predicted change in liquidity and token amounts.
 */
export async function getReinvestedPosition(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  positionId: BigNumberish,
  provider: JsonRpcProvider,
  blockNumber?: number,
): Promise<{
  liquidity: BigNumber;
  amount0: BigNumber;
  amount1: BigNumber;
}> {
  const owner = await getNPM(chainId, amm, provider).ownerOf(positionId, {
    blockTag: blockNumber,
  });
  const { functionFragment, data } = getAutomanReinvestCallInfo(
    positionId,
    Math.round(new Date().getTime() / 1000 + 60 * 10), // 10 minutes from now.
  );
  const returnData = await staticCallWithOverrides(
    {
      from: owner,
      to: getAMMInfo(chainId, amm)!.apertureAutoman,
      data,
    },
    // forge an operator approval using state overrides.
    getNPMApprovalOverrides(chainId, amm, owner),
    provider,
    blockNumber,
  );
  return IAutoman__factory.createInterface().decodeFunctionResult(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    functionFragment,
    returnData,
  ) as unknown as {
    liquidity: BigNumber;
    amount0: BigNumber;
    amount1: BigNumber;
  };
}
