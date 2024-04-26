import { ApertureSupportedChainId, fractionToBig } from '@/index';
import { Position } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { simulateIncreaseLiquidityOptimal } from './automan';
import { getFromAddress } from './internal';
import { IncreaseLiquidityParams } from './types';

type IIncreaseLiquidityOptimalParams = {
  chainId: ApertureSupportedChainId;
  amm: AutomatedMarketMakerEnum;
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

async function getExchangePrice(params: IIncreaseLiquidityOptimalParams) {
  const {
    chainId,
    amm,
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
    amm,
    publicClient,
    from,
    position,
    increaseParams,
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
