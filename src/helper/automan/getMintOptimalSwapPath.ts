import { ApertureSupportedChainId } from '@/index';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';
import Big from 'big.js';

import { optimalMint } from '../aggregator';
import { getNativeCurrency } from '../currency';

type IMintOptimalSwapPathParams = {
  chainId: ApertureSupportedChainId;
  token0Amount: CurrencyAmount<Currency>;
  token1Amount: CurrencyAmount<Currency>;
  fee: FeeAmount;
  tickLower: number;
  tickUpper: number;
  slippage: number;
  recipient: string;
  provider: JsonRpcProvider | Provider;
  use1inch?: boolean;
};
type SwapPath = {
  tokenIn: Currency;
  tokenInAmount: Big;
  tokenOut: Currency;
  tokenOutAmount: Big;
  minAmountOut: string;
};

export async function getMintOptimalSwapPath(
  params: IMintOptimalSwapPathParams,
): Promise<SwapPath> {
  const {
    chainId,
    fee,
    tickLower,
    tickUpper,
    provider,
    recipient,
    slippage,
    use1inch,
  } = params;
  let { token0Amount, token1Amount } = params;
  if (token0Amount.currency.isNative) {
    token0Amount = CurrencyAmount.fromRawAmount(
      getNativeCurrency(chainId).wrapped,
      token0Amount.quotient,
    );
  } else if (token1Amount.currency.isNative) {
    token1Amount = CurrencyAmount.fromRawAmount(
      getNativeCurrency(chainId).wrapped,
      token1Amount.quotient,
    );
  }
  const { amount0, amount1 } = await optimalMint(
    chainId,
    token0Amount as CurrencyAmount<Token>,
    token1Amount as CurrencyAmount<Token>,
    fee,
    tickLower,
    tickUpper,
    recipient,
    slippage,
    provider,
    !use1inch,
  );

  const initAmount0 = token0Amount.quotient.toString();
  const initAmount1 = token1Amount.quotient.toString();
  const deltaAmount0 = new Big(initAmount0).minus(amount0.toString());
  const deltaAmount1 = new Big(initAmount1).minus(amount1.toString());

  const tokenIn = deltaAmount0.gt(0)
    ? token0Amount.currency
    : token1Amount.currency;
  const tokenInAmount = deltaAmount0.gt(0) ? deltaAmount0 : deltaAmount1;
  const tokenOut = deltaAmount0.gt(0)
    ? token1Amount.currency
    : token0Amount.currency;
  const tokenOutAmount = deltaAmount0.gt(0) ? deltaAmount1 : deltaAmount0;
  const minAmountOut = tokenOutAmount.times(1 - slippage).toFixed(0);

  return {
    tokenIn,
    tokenInAmount,
    tokenOut,
    tokenOutAmount,
    minAmountOut,
  };
}
