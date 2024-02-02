import { ApertureSupportedChainId, fractionToBig } from '@/index';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { getPosition } from '../position';
import { simulateRebalance, simulateRemoveLiquidity } from './automan';
import { getFromAddress } from './internal';
import { MintParams } from './types';

type IRebalanceParams = {
  chainId: ApertureSupportedChainId;
  publicClient: PublicClient;
  from?: Address;
  owner: Address;
  mintParams: MintParams;
  tokenId: bigint;
  feeBips?: bigint;
  swapData?: Hex;
  blockNumber?: bigint;
};

/**
 * calculate the price impact of this rebalance, priceImpact = abs(exchangePrice / currentPoolPrice - 1).
 */
export async function calculateRebalancePriceImpact(params: IRebalanceParams) {
  const { chainId, publicClient, tokenId, blockNumber } = params;
  const position = await getPosition(
    chainId,
    tokenId,
    publicClient,
    blockNumber,
  );

  const currentPoolPrice = fractionToBig(position.pool.token0Price);
  const exchangePrice = await getExchangePrice(params);

  if (exchangePrice.eq(0)) {
    return exchangePrice;
  }

  return new Big(exchangePrice).div(currentPoolPrice).minus(1).abs();
}

async function getExchangePrice(params: IRebalanceParams) {
  const {
    chainId,
    publicClient,
    owner,
    mintParams,
    tokenId,
    feeBips,
    swapData,
    blockNumber,
  } = params;
  const from = getFromAddress(params.from);

  const [[initAmount0, initAmount1], [, , finalAmount0, finalAmount1]] =
    await Promise.all([
      simulateRemoveLiquidity(
        chainId,
        publicClient,
        from,
        owner,
        tokenId,
        undefined,
        undefined,
        feeBips,
        blockNumber,
      ),
      simulateRebalance(
        chainId,
        publicClient,
        from,
        owner,
        mintParams,
        tokenId,
        feeBips,
        swapData,
        blockNumber,
      ),
    ]);

  const deltaAmount1 = new Big(finalAmount1.toString()).minus(
    initAmount1.toString(),
  );

  if (deltaAmount1.eq(0)) {
    return deltaAmount1;
  }

  return deltaAmount1.div(
    new Big(initAmount0.toString()).minus(finalAmount0.toString()),
  );
}
