import { Pool } from '@aperture_finance/uniswap-v3-sdk';
import { Price, Token } from '@uniswap/sdk-core';

/**
 * Get the price of `token0` in terms of `token1` in the pool.
 * @param pool A Uniswap v3 pool.
 * @returns The price of `token0` in terms of `token1` in the pool.
 */
export function getPoolPrice(pool: Pool): Price<Token, Token> {
  return pool.token0Price;
}
