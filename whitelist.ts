import { Token } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';
import { getAddress } from 'viem';

import { ApertureSupportedChainId } from './interfaces';

export interface WhitelistedPool {
  token0: Token;
  token1: Token;
  feeTier: FeeAmount;
}

export interface Pool {
  id: string;
  feeTier: string;
  token0: {
    id: string;
    decimals: string;
    symbol: string;
    name: string;
  };
  token1: {
    id: string;
    decimals: string;
    symbol: string;
    name: string;
  };
}

/**
 * Returns a map of whitelisted pools for the specified chain.
 * @param chainId Chain id.
 * @param whitelistedPoolsJson Whitelisted pools JSON.
 * @returns A map of whitelisted pools keyed by pool addresses.
 */
export function getWhitelistedPools(
  chainId: ApertureSupportedChainId,
  whitelistedPoolsJson: Pool[],
): Map<string, WhitelistedPool> {
  const whitelistedPoolsMap = new Map();
  for (const pool of whitelistedPoolsJson) {
    whitelistedPoolsMap.set(getAddress(pool.id), {
      feeTier: Number(pool.feeTier),
      token0: new Token(
        chainId,
        getAddress(pool.token0.id),
        Number(pool.token0.decimals),
        pool.token0.symbol,
        pool.token0.name,
      ),
      token1: new Token(
        chainId,
        getAddress(pool.token1.id),
        Number(pool.token1.decimals),
        pool.token1.symbol,
        pool.token1.name,
      ),
    });
  }
  return whitelistedPoolsMap;
}

/**
 * Returns a map of whitelisted tokens for the specified chain.
 * @param chainId Chain id.
 * @param whitelistedPoolsJson Whitelisted pools JSON.
 * @returns A map of whitelisted tokens keyed by token symbols.
 */
export function getWhitelistedTokens(
  chainId: ApertureSupportedChainId,
  whitelistedPoolsJson: Pool[],
): Map<string, string> {
  const whitelistedTokens = new Map();
  for (const pool of whitelistedPoolsJson) {
    if (!whitelistedTokens.has(pool.token0.symbol)) {
      whitelistedTokens.set(pool.token0.symbol, getAddress(pool.token0.id));
    }
    if (!whitelistedTokens.has(pool.token1.symbol)) {
      whitelistedTokens.set(pool.token1.symbol, getAddress(pool.token1.id));
    }
  }
  return whitelistedTokens;
}
