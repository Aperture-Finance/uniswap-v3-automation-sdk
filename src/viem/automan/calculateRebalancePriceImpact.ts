import { ApertureSupportedChainId, fractionToBig } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { PublicClient } from 'viem';

import { getPosition } from '../position';
import { MintParams } from './types';

type IRebalanceParams = {
  chainId: ApertureSupportedChainId;
  amm: AutomatedMarketMakerEnum;
  publicClient: PublicClient;
  mintParams: MintParams;
  tokenId: bigint;
  blockNumber?: bigint;
  finalAmount0: bigint;
  finalAmount1: bigint;
};

/**
 * calculate the price impact of this rebalance, priceImpact = abs(exchangePrice / currentPoolPrice - 1).
 */
export async function calculateRebalancePriceImpact({
  chainId,
  amm,
  publicClient,
  mintParams,
  tokenId,
  blockNumber,
  finalAmount0,
  finalAmount1,
}: IRebalanceParams) {
  const position = await getPosition(
    chainId,
    amm,
    tokenId,
    publicClient,
    blockNumber,
  );

  const currentPoolPrice = fractionToBig(position.pool.token0Price);
  const { amount0Desired: initAmount0, amount1Desired: initAmount1 } =
    mintParams;

  const deltaAmount1 = new Big(finalAmount1.toString()).minus(
    initAmount1.toString(),
  );

  const exchangePrice = deltaAmount1.eq(0)
    ? deltaAmount1
    : deltaAmount1.div(
        new Big(initAmount0.toString()).minus(finalAmount0.toString()),
      );

  return {
    priceImpact: exchangePrice.eq(0)
      ? exchangePrice
      : new Big(exchangePrice).div(currentPoolPrice).minus(1).abs(),
  };
}
