import { ApertureSupportedChainId, fractionToBig } from '@/index';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { getPoolPrice } from '../pool';
import { getPosition } from '../position';
import { simulateRebalance, simulateRemoveLiquidity } from './automan';
import { MintParams, getFromAddress } from './internal';

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
 * need to use infura client
 */
export async function calculateRebalancePriceImpact(params: IRebalanceParams) {
  const { chainId, publicClient, tokenId, blockNumber } = params;
  const position = await getPosition(
    chainId,
    tokenId,
    publicClient,
    blockNumber,
  );

  const price = getPoolPrice(position.pool);
  const currentPoolPrice = fractionToBig(price);

  const exchangePrice = await getExchangePrice(params);
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

  const [initAmount, finalAmount] = await Promise.all([
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

  const [, , finalAmount0, finalAmount1]: bigint[] = finalAmount;
  const [initAmount0, initAmount1]: bigint[] = initAmount;
  return new Big(finalAmount1.toString())
    .minus(initAmount1.toString())
    .div(new Big(initAmount0.toString()).minus(finalAmount0.toString()));
}
