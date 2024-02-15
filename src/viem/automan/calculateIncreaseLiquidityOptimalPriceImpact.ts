import { ApertureSupportedChainId, fractionToBig } from '@/index';
import { Position } from '@uniswap/v3-sdk';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { simulateIncreaseLiquidityOptimal } from './automan';
import { IncreaseLiquidityParams, getFromAddress } from './internal';

type IIncreaseLiquidityOptimalParams = {
  chainId: ApertureSupportedChainId;
  publicClient: PublicClient;
  from: Address;
  position: Position;
  increaseParams: IncreaseLiquidityParams;
  swapData?: Hex;
  blockNumber?: bigint;
};

/**
 * calculate the price impact of increaseLiquidityOptimal(aka Zap-in add liquidity)
 */
export async function calculateIncreaseLiquidityOptimalPriceImpact(
  params: IIncreaseLiquidityOptimalParams,
) {
  const { position } = params;

  const currentPoolPrice = fractionToBig(position.pool.token0Price);
  const exchangePrice = await getExchangePrice(params);

  if (exchangePrice.eq(0)) {
    return exchangePrice;
  }

  return new Big(exchangePrice).div(currentPoolPrice).minus(1).abs();
}

async function getExchangePrice(params: IIncreaseLiquidityOptimalParams) {
  const {
    chainId,
    publicClient,
    position,
    increaseParams,
    swapData,
    blockNumber,
  } = params;

  const from = getFromAddress(params.from);
  const { amount0Desired: initAmount0, amount1Desired: initAmount1 } =
    increaseParams;

  const [, finalAmount0, finalAmount1] = await simulateIncreaseLiquidityOptimal(
    chainId,
    publicClient,
    from,
    position,
    increaseParams,
    swapData,
    blockNumber,
  );

  if (initAmount0 === finalAmount0) return new Big(0);

  return new Big(finalAmount1.toString())
    .minus(initAmount1.toString())
    .div(new Big(initAmount0.toString()).minus(finalAmount0.toString()));
}
