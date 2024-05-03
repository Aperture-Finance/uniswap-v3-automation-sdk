import { fractionToBig } from '@/index';
import { Pool } from '@aperture_finance/uniswap-v3-sdk';
import Big from 'big.js';
import { Address } from 'viem';

import { SwapPath } from './types';

export const calcPriceImpact = (
  pool: Pool,
  initAmount0: bigint,
  initAmount1: bigint,
  finalAmount0: bigint,
  finalAmount1: bigint,
) => {
  const currentPoolPrice = fractionToBig(pool.token0Price);
  const exchangePrice =
    initAmount0 === finalAmount0
      ? new Big(0)
      : new Big(finalAmount1.toString())
          .minus(initAmount1.toString())
          .div(new Big(initAmount0.toString()).minus(finalAmount0.toString()));

  return exchangePrice.eq(0)
    ? exchangePrice
    : new Big(exchangePrice).div(currentPoolPrice).minus(1).abs();
};

export const getSwapPath = (
  token0Address: Address,
  token1Address: Address,
  initToken0Amount: bigint,
  initToken1Amount: bigint,
  finalToken0Amount: bigint,
  finalToken1Amount: bigint,
  slippage: number,
): SwapPath => {
  const [tokenIn, tokenOut, amountIn, amountOut] =
    finalToken0Amount > initToken0Amount
      ? [
          token1Address,
          token0Address,
          initToken1Amount - finalToken1Amount,
          finalToken0Amount - initToken0Amount,
        ]
      : [
          token0Address,
          token1Address,
          initToken0Amount - finalToken0Amount,
          finalToken1Amount - initToken1Amount,
        ];

  return {
    tokenIn: tokenIn,
    tokenOut: tokenOut,
    amountIn: amountIn.toString(),
    amountOut: amountOut.toString(),
    minAmountOut: new Big(amountOut.toString())
      .times(1 - slippage * 0.01)
      .toFixed(0),
  };
};
