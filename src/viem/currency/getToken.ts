import { ApertureSupportedChainId, ERC20__factory } from '@/index';
import { IERC20__factory } from '@/typechain-types';
import { Token } from '@uniswap/sdk-core';
import { Address, PublicClient, getContract } from 'viem';

import { getPublicClient } from '../public_client';

export async function getToken(
  tokenAddress: Address,
  chainId: ApertureSupportedChainId,
  publicClient?: PublicClient,
  blockNumber?: bigint,
  showSymbolAndName?: boolean,
): Promise<Token> {
  const contract = getContract({
    address: tokenAddress,
    abi: ERC20__factory.abi,
    client: publicClient ?? getPublicClient(chainId),
  });
  const opts = { blockNumber };
  if (showSymbolAndName) {
    try {
      const [decimals, symbol, name] = await Promise.all([
        contract.read.decimals(opts),
        contract.read.symbol(opts),
        contract.read.name(opts),
      ]);
      return new Token(chainId, tokenAddress, decimals, symbol, name);
    } catch (e) {
      console.log(
        `Not able to fetch token info for tokenAddress ${tokenAddress}`,
        e,
      );
      return new Token(chainId, tokenAddress, 18);
    }
  } else {
    const decimals = await contract.read.decimals(opts);
    return new Token(chainId, tokenAddress, decimals);
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
