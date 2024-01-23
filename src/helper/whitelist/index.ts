import { ApertureSupportedChainId, getChainInfo } from '@/index';
import { Token } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';
import axios from 'axios';
import { getAddress } from 'ethers/lib/utils';

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
 * Returns a list of all pools from the Uniswap subgraph.
 * This is meant to be used to construct a whitelist of all pools on Manta Pacific.
 * Note that pagination is specifically not handled since the number of pools is not expected to exceed the response limit during the lifetime of this interim solution.
 * @param chainId Aperture supported chain id.
 * @returns A list of all pools returned from the Uniswap subgraph.
 */
export async function getPoolsFromSubgraph(
  chainId: ApertureSupportedChainId,
): Promise<Pool[]> {
  return (
    await axios.post(getChainInfo(chainId).uniswap_subgraph_url!, {
      operationName: 'getAllPools',
      query: `query getAllPools {
                  pools {
                    id
                    feeTier
                    token0 {
                      id
                      symbol
                      decimals
                      name
                    }
                    token1 {
                      id
                      symbol
                      decimals
                      name
                    }
                  }
                }`,
      variables: {},
    })
  ).data.data.pools;
}

// Sample code for constructing whitelisted pools and tokens for Manta Pacific.
// async function sampleCodeForConstructingWhitelistedPoolsAndTokensForMantaPacific() {
//   const allMantaPacificPools = await getPoolsFromSubgraph(
//     ApertureSupportedChainId.MANTA_PACIFIC_TESTNET_CHAIN_ID,
//   );
//   const whitelistedPools = getWhitelistedPools(
//     ApertureSupportedChainId.MANTA_PACIFIC_TESTNET_CHAIN_ID,
//     allMantaPacificPools,
//   );
//   const whitelistedTokens = getWhitelistedTokens(
//     ApertureSupportedChainId.MANTA_PACIFIC_TESTNET_CHAIN_ID,
//     allMantaPacificPools,
//   );
// }

/**
 * Returns a map of whitelisted tokens for the specified chain.
 * @param chainId Chain id.
 * @param whitelistedPoolsJson Whitelisted pools JSON.
 * @returns A map of whitelisted tokens keyed by token symbols.
 */
export function getWhitelistedTokens(
  chainId: ApertureSupportedChainId,
  whitelistedPoolsJson: Pool[],
): Map<string, Token> {
  const whitelistedTokens = new Map();
  for (const pool of whitelistedPoolsJson) {
    const token0Address = getAddress(pool.token0.id);
    const token1Address = getAddress(pool.token1.id);
    if (!whitelistedTokens.has(token0Address)) {
      whitelistedTokens.set(
        token0Address,
        new Token(
          chainId,
          token0Address,
          Number(pool.token0.decimals),
          pool.token0.symbol,
          pool.token0.name,
        ),
      );
    }
    if (!whitelistedTokens.has(token1Address)) {
      whitelistedTokens.set(
        token1Address,
        new Token(
          chainId,
          token1Address,
          Number(pool.token1.decimals),
          pool.token1.symbol,
          pool.token1.name,
        ),
      );
    }
  }
  return whitelistedTokens;
}
