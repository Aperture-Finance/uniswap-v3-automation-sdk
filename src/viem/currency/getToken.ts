import { ApertureSupportedChainId, ERC20__factory } from '@/index';
import { IERC20__factory } from '@/typechain-types';
import { Token } from '@uniswap/sdk-core';
import { Address, PublicClient } from 'viem';

import { getPublicClient } from '../public_client';

export async function getToken(
  tokenAddress: Address,
  chainId: ApertureSupportedChainId,
  publicClient?: PublicClient,
  blockNumber?: bigint,
  showSymbolAndName?: boolean,
): Promise<Token> {
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
        return new Token(chainId, tokenAddress, decimals, symbol, name);
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
        return new Token(chainId, tokenAddress, Number(decimalsResult.result));
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

export async function bulkGetToken(
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

export async function bulkGetTokenBalance(
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
