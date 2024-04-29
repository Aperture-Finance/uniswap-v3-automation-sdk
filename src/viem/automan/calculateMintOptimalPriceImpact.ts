import { ApertureSupportedChainId, fractionToBig } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { getPool } from '../pool';
import { MintParams } from './types';

interface IMintOptimalParams {
  chainId: ApertureSupportedChainId;
  amm: AutomatedMarketMakerEnum;
  publicClient: PublicClient;
  from: Address;
  mintParams: MintParams;
  swapData?: Hex;
  blockNumber?: bigint;
  finalAmount0: bigint;
  finalAmount1: bigint;
}

/**
 * calculate the price impact of mintOptimal(aka Zap-in)
 */
export async function calculateMintOptimalPriceImpact({
  mintParams: {
    token0,
    token1,
    fee,
    amount0Desired: initAmount0,
    amount1Desired: initAmount1,
  },
  chainId,
  amm,
  publicClient,
  blockNumber,
  finalAmount0,
  finalAmount1,
}: IMintOptimalParams) {
  const pool = await getPool(
    token0,
    token1,
    fee,
    chainId,
    amm,
    publicClient,
    blockNumber,
  );

  const currentPoolPrice = fractionToBig(pool.token0Price);

  const exchangePrice =
    initAmount0 === finalAmount0
      ? new Big(0)
      : new Big(finalAmount1.toString())
          .minus(initAmount1.toString())
          .div(new Big(initAmount0.toString()).minus(finalAmount0.toString()));

  return {
    priceImpact: exchangePrice.eq(0)
      ? exchangePrice
      : new Big(exchangePrice).div(currentPoolPrice).minus(1).abs(),
  };
}
