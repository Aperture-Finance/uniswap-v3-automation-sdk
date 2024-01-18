import { ApertureSupportedChainId, fractionToBig } from '@/index';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { getPool } from '../pool';
import { simulateMintOptimal } from './automan';
import { MintParams, getFromAddress } from './internal';

type IMintOptimalParams = {
  chainId: ApertureSupportedChainId;
  publicClient: PublicClient;
  from: Address;
  mintParams: MintParams;
  swapData?: Hex;
  blockNumber?: bigint;
};

/**
 * calculate the price impact of mintOptimal(aka Zap-in)
 */
export async function calculateMintOptimalPriceImpact(
  params: IMintOptimalParams,
) {
  const {
    mintParams: { token0, token1, fee },
    chainId,
    publicClient,
    blockNumber,
  } = params;

  const pool = await getPool(
    token0,
    token1,
    fee,
    chainId,
    publicClient,
    blockNumber,
  );

  const currentPoolPrice = fractionToBig(pool.token0Price);
  const exchangePrice = await getExchangePrice(params);

  return new Big(exchangePrice).div(currentPoolPrice).minus(1).abs();
}

async function getExchangePrice(params: IMintOptimalParams) {
  const { chainId, publicClient, mintParams, swapData, blockNumber } = params;
  const from = getFromAddress(params.from);

  const { amount0Desired: initAmount0, amount1Desired: initAmount1 } =
    mintParams;

  const [, , finalAmount0, finalAmount1] = await simulateMintOptimal(
    chainId,
    publicClient,
    from,
    mintParams,
    swapData,
    blockNumber,
  );

  return new Big(finalAmount1.toString())
    .minus(initAmount1.toString())
    .div(new Big(initAmount0.toString()).minus(finalAmount0.toString()));
}
