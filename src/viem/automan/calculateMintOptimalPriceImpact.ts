import { ApertureSupportedChainId, fractionToBig } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { getPool } from '../pool';
import { simulateMintOptimal } from './automan';
import { getFromAddress } from './internal';
import { MintParams } from './types';

type IMintOptimalParams = {
  chainId: ApertureSupportedChainId;
  amm: AutomatedMarketMakerEnum;
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
    amm,
    publicClient,
    blockNumber,
  } = params;

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
  const { exchangePrice, finalAmount0, finalAmount1 } =
    await getExchangePrice(params);

  return {
    priceImpact: exchangePrice.eq(0)
      ? exchangePrice
      : new Big(exchangePrice).div(currentPoolPrice).minus(1).abs(),
    finalAmount0,
    finalAmount1,
  };
}

async function getExchangePrice(params: IMintOptimalParams) {
  const { chainId, amm, publicClient, mintParams, swapData, blockNumber } =
    params;
  const from = getFromAddress(params.from);

  const { amount0Desired: initAmount0, amount1Desired: initAmount1 } =
    mintParams;

  const [, , finalAmount0, finalAmount1] = await simulateMintOptimal(
    chainId,
    amm,
    publicClient,
    from,
    mintParams,
    swapData,
    blockNumber,
  );

  return {
    exchangePrice:
      initAmount0 === finalAmount0
        ? new Big(0)
        : new Big(finalAmount1.toString())
            .minus(initAmount1.toString())
            .div(
              new Big(initAmount0.toString()).minus(finalAmount0.toString()),
            ),
    finalAmount0,
    finalAmount1,
  };
}
