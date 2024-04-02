import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { BigintIsh, CurrencyAmount, Token } from '@uniswap/sdk-core';

export interface BasicPositionInfo {
  token0: Token;
  token1: Token;
  fee: FeeAmount;
  liquidity?: BigintIsh;
  tickLower: number;
  tickUpper: number;
}

export interface CollectableTokenAmounts {
  token0Amount: CurrencyAmount<Token>;
  token1Amount: CurrencyAmount<Token>;
}
