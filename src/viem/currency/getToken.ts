import { ApertureSupportedChainId, ERC20__factory } from '@/index';
import { IERC20__factory } from '@/typechain-types';
import { TimedCache } from '@/utils/cache';
import { Token } from '@uniswap/sdk-core';
import { Address, PublicClient } from 'viem';

import { getPublicClient } from '../public_client';

// Cache structure: chainId -> address -> Token
const tokenCaches = new Map<
  ApertureSupportedChainId,
  TimedCache<string, Token>
>();

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

function getCachedToken(
  address: string,
  chainId: ApertureSupportedChainId,
): Token | undefined {
  if (process.env.IS_SDK_TEST_MODE) {
    return undefined;
  }

  const chainCache = tokenCaches.get(chainId);
  if (!chainCache) return undefined;
  return chainCache.get(address);
}

function cacheToken(token: Token, chainId: ApertureSupportedChainId): void {
  let chainCache = tokenCaches.get(chainId);
  if (!chainCache) {
    chainCache = new TimedCache<string, Token>(CACHE_DURATION);
    tokenCaches.set(chainId, chainCache);
  }

  chainCache.set(token.address, token);
}

export async function getToken(
  tokenAddress: Address,
  chainId: ApertureSupportedChainId,
  publicClient?: PublicClient,
  blockNumber?: bigint,
  showSymbolAndName?: boolean,
): Promise<Token> {
  // Check cache first (only if not requesting a specific block)
  if (!blockNumber) {
    const cachedToken = getCachedToken(tokenAddress, chainId);
    if (cachedToken) {
      // If we need full token info and cached token has it, return cached
      if (!showSymbolAndName || (cachedToken.symbol && cachedToken.name)) {
        console.debug('getToken hit cache', tokenAddress);
        return cachedToken;
      }
    }
  }

  const client = publicClient ?? getPublicClient(chainId);
  const contract = {
    address: tokenAddress,
    abi: ERC20__factory.abi,
  };

  try {
    if (showSymbolAndName) {
      const multicallResults = await client.multicall({
        contracts: [
          {
            ...contract,
            functionName: 'decimals',
          },
          {
            ...contract,
            functionName: 'symbol',
          },
          {
            ...contract,
            functionName: 'name',
          },
        ],
        blockNumber,
      });

      const [decimalsResult, symbolResult, nameResult] = multicallResults;

      if (decimalsResult.status === 'success') {
        const decimals = decimalsResult.result as number;
        const symbol =
          symbolResult.status === 'success'
            ? (symbolResult.result as string)
            : undefined;
        const name =
          nameResult.status === 'success'
            ? (nameResult.result as string)
            : undefined;
        const token = new Token(chainId, tokenAddress, decimals, symbol, name);

        // Cache the token if not requesting a specific block
        if (!blockNumber) {
          cacheToken(token, chainId);
        }

        return token;
      }

      console.log(
        `Not able to fetch token info for tokenAddress ${tokenAddress}`,
        decimalsResult.error,
      );
      return new Token(chainId, tokenAddress, 18);
    } else {
      const [decimalsResult] = await client.multicall({
        contracts: [
          {
            ...contract,
            functionName: 'decimals',
          },
        ],
        blockNumber,
      });

      if (decimalsResult.status === 'success') {
        const token = new Token(
          chainId,
          tokenAddress,
          Number(decimalsResult.result),
        );

        // Cache the token if not requesting a specific block
        if (!blockNumber) {
          cacheToken(token, chainId);
        }

        return token;
      }

      console.log(
        `Not able to fetch decimals for tokenAddress ${tokenAddress}`,
        decimalsResult.error,
      );
      return new Token(chainId, tokenAddress, 18);
    }
  } catch (error) {
    console.error('Error fetching token info:', error);
    return new Token(chainId, tokenAddress, 18);
  }
}

export async function getBulkTokens(
  tokens: Address[],
  chainId: ApertureSupportedChainId,
  publicClient?: PublicClient,
  blockNumber?: bigint,
  showSymbolAndName?: boolean,
): Promise<Token[]> {
  const client = publicClient ?? getPublicClient(chainId);
  const contracts = tokens.map((address) => ({
    address,
    abi: ERC20__factory.abi,
  }));

  try {
    if (showSymbolAndName) {
      const multicallResults = await client.multicall({
        contracts: contracts.flatMap((contract) => [
          {
            ...contract,
            functionName: 'decimals',
          },
          {
            ...contract,
            functionName: 'symbol',
          },
          {
            ...contract,
            functionName: 'name',
          },
        ]),
        blockNumber,
      });

      return tokens.map((address, i) => {
        const baseIndex = i * 3;
        const [decimalsResult, symbolResult, nameResult] =
          multicallResults.slice(baseIndex, baseIndex + 3);

        if (decimalsResult.status === 'success') {
          const decimals = decimalsResult.result as number;
          const symbol =
            symbolResult.status === 'success'
              ? (symbolResult.result as string)
              : undefined;
          const name =
            nameResult.status === 'success'
              ? (nameResult.result as string)
              : undefined;
          return new Token(chainId, address, decimals, symbol, name);
        }

        console.log(
          `Not able to fetch token info for tokenAddress ${address}`,
          decimalsResult.error,
        );
        return new Token(chainId, address, 18);
      });
    } else {
      const multicallResults = await client.multicall({
        contracts: contracts.map((contract) => ({
          ...contract,
          functionName: 'decimals',
        })),
        blockNumber,
      });

      return tokens.map((address, i) => {
        const result = multicallResults[i];
        if (result.status === 'success') {
          return new Token(chainId, address, Number(result.result));
        }
        console.log(
          `Not able to fetch decimals for tokenAddress ${address}`,
          result.error,
        );
        return new Token(chainId, address, 18);
      });
    }
  } catch (error) {
    console.error('Error in bulk token fetch:', error);
    throw error;
  }
}

export async function getBulkTokenBalances(
  client: PublicClient,
  wallet: Address,
  tokens: Address[],
) {
  return client.multicall({
    contracts: tokens.map((token) => ({
      address: token,
      abi: IERC20__factory.abi,
      functionName: 'balanceOf',
      args: [wallet],
    })),
  });
}
