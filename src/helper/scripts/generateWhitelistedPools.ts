import {
  ApertureSupportedChainId,
  getChainInfo,
  getTokenPriceListFromCoingecko,
} from '@/index';
import { Token } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';
import axios from 'axios';
import { config as dotenvConfig } from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';

import { computePoolAddress } from '../pool';
import { Pool } from '../whitelist';

dotenvConfig();

async function generateWhitelistedPools(chainId: number) {
  const response = await axios.post(
    getChainInfo(chainId).uniswap_subgraph_url!,
    {
      operationName: 'topPools',
      query: `
        query topPools {
            pools(
                first: 50
                orderBy: totalValueLockedUSD
                orderDirection: desc
                subgraphError: allow
            ) {
                id
                totalValueLockedUSD
                feeTier
                volumeUSD
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
    },
  );
  const pools = response.data.data.pools.filter(
    (pool: { id: string; volumeUSD: string }) =>
      pool.volumeUSD !== '0' ||
      (chainId === ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID &&
        // ARB/USDC 0.05% pool on Arbitrum. Subgraph erroneously reports 0 volume. https://info.uniswap.org/#/arbitrum/pools/0xb0f6ca40411360c03d41c5ffc5f179b8403cdcf8
        pool.id === '0xb0f6ca40411360c03d41c5ffc5f179b8403cdcf8'),
  );
  const filteredPools =
    chainId === ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID
      ? pools.filter(
          (pool: { id: string }) =>
            // ETH-ETHM pool with 5000 ETH and ETHM; no trades at all during the 120-day period before May 9, 2023.
            pool.id != '0x40e629a26d96baa6d81fae5f97205c2ab2c1ff29' &&
            // ETH-BTT pool with nearly 0 ETH and 27.59 trillion BTT tokens.
            pool.id != '0x64a078926ad9f9e88016c199017aea196e3899e1' &&
            // Pool involves ZVT (Zombie Virus Token) which isn't on Coingecko.
            pool.id != '0x58fcd403610e772d68726b55183eb958a7581731' &&
            // Pool involves SpongeBob token which isn't on Coingecko.
            pool.id != '0xf935f557e06a7d040dea4691f90c9a755301818b',
        )
      : pools.filter(
          (pool: { id: string }) =>
            // ETH-G with no trade at all during the 41-day period before May 9, 2023.
            pool.id != '0x98c1c8530de9d59f3977dc230bec73fef0011aff' &&
            // PSI-ETH with no trades at all during the 90-day period before May 9, 2023.
            pool.id != '0x50c7390dfdd3756139e6efb5a461c2eb7331ceb4' &&
            // Pool involves CRYPTO (New Crypto Space) which isn't on Coingecko.
            pool.id != '0x14af1804dbbf7d621ecc2901eef292a24a0260ea' &&
            // Pool involves Taikula token which isn't on Coingecko.
            pool.id != '0x83b43b0652cced8de54c4f941c97ecbb07fbfa01' &&
            // Pool involves RNDT (Radiant) token which isn't on Coingecko.
            pool.id != '0x2334d412da299a21486b663d12c392185b313aaa',
        );

  const USDCe = '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8';
  // create a set of unique token ids
  const tokens: Set<string> = new Set();
  for (const pool of filteredPools) {
    if (pool.token0.id.toLowerCase() == USDCe) {
      pool.token0.symbol = 'USDC.e';
      pool.token0.name = 'Bridged USDC (USDC.e)';
    } else if (pool.token1.id.toLowerCase() == USDCe) {
      pool.token1.symbol = 'USDC.e';
      pool.token1.name = 'Bridged USDC (USDC.e)';
    }
    tokens.add(pool.token0.id);
    tokens.add(pool.token1.id);
  }

  writeFileSync(
    `data/whitelistedPools-${chainId}.json`,
    JSON.stringify(filteredPools, null, 2),
    'utf-8',
  );

  // Convert the Set to an Array of Token objects, then pass to the function
  const tokenArray = Array.from(tokens).map(
    (addr) => new Token(chainId, addr, 18),
  );

  // call coingecko API for all tokens at once
  const priceList = await getTokenPriceListFromCoingecko(tokenArray);

  // loop over priceList and print information
  for (const token in priceList) {
    if (priceList[token]) {
      console.log(`Token ${token}'s price is ${priceList[token]}.`);
    } else {
      console.log(`Token ${token} doesn't have Coingecko price support.`);
    }
  }
  console.log(
    `Generated ${filteredPools.length} whitelisted pools for chain id ${chainId}, involving ${tokens.size} tokens.`,
  );
}

generateWhitelistedPools(ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID);
generateWhitelistedPools(ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID);
// There are 43 whitelisted pools involving 27 tokens on Ethereum mainnet.
// There are 38 whitelisted pools involving 21 tokens on Arbitrum.

/**
 * Generate the pool addresses for the whitelisted pools on testnet.
 * @param chainId The chain id.
 */
function generateTestnetPools(chainId: number) {
  const path = `data/whitelistedPools-${chainId}.json`;
  // Read and parse the JSON file
  const rawData = readFileSync(path, 'utf-8');
  const pools: Pool[] = JSON.parse(rawData);
  // Modify each pool in the array
  for (const pool of pools) {
    if (pool.token0.id.toLowerCase() > pool.token1.id.toLowerCase()) {
      // Swap the order of token0 and token1
      [pool.token0, pool.token1] = [pool.token1, pool.token0];
    }
    // Replace the id field with the computed pool address
    pool.id = computePoolAddress(
      getChainInfo(chainId).uniswap_v3_factory,
      pool.token0.id,
      pool.token1.id,
      Number(pool.feeTier) as FeeAmount,
    );
  }

  // Stringify and write the modified object back to the file
  const newData = JSON.stringify(pools, null, 2);
  writeFileSync(path, newData, 'utf-8');
}

generateTestnetPools(ApertureSupportedChainId.GOERLI_TESTNET_CHAIN_ID);
