import {
  ApertureSupportedChainId,
  getChainInfo,
} from '@aperture_finance/uniswap-v3-automation-sdk';
import axios from 'axios';
import { writeFileSync } from 'fs';

import whitelistedPoolsEthereum from '../data/whitelistedPools-1.json';
import whitelistedPoolsArbitrum from '../data/whitelistedPools-42161.json';
import { fetchUniV3PoolsFromGeckoTerminal } from './fetchUniV3PoolsFromGeckoTerminal';

type WhitelistedPools = typeof whitelistedPoolsEthereum;

async function generateWhitelistOfSpecificPools(
  chainId: number,
  poolsToFetch: string[],
  currentWhitelist: WhitelistedPools,
) {
  // Add existing whitelisted pools if not on the to-fetch list.
  const poolsToFetchSet = new Set(poolsToFetch);
  for (const pool of currentWhitelist) {
    if (!poolsToFetchSet.has(pool.id)) {
      console.log(`Pool ${pool.id} is added to the list to fetch.`);
      poolsToFetch.push(pool.id.toLowerCase());
    }
  }

  console.log(`Fetching information for ${poolsToFetch.length} pools...`);
  let pools: WhitelistedPools = [];
  for (let startIndex = 0; startIndex < poolsToFetch.length; startIndex += 50) {
    const response = await axios.post(
      getChainInfo(chainId).uniswap_subgraph_url!,
      {
        operationName: 'fetchSpecificPools',
        query: `
          query SpecificPools {
              pools(where: {id_in: ["${poolsToFetch
                .slice(startIndex, startIndex + 50)
                .join('", "')}"]}) {
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
    pools = pools.concat(response.data.data.pools);
  }

  const USDCe = '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8';
  // Create a set of unique token ids
  const tokens: Set<string> = new Set();
  for (const pool of pools) {
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

  // Fetch token prices in batches from Coingecko.
  const tokenArray = Array.from(tokens);
  let priceList: { [address: string]: number } = {};
  const { coingecko_asset_platform_id } = getChainInfo(chainId);
  for (let startIndex = 0; startIndex < tokenArray.length; startIndex += 50) {
    const priceResponse = await axios.get(
      `https://api.coingecko.com/api/v3/simple/token_price/${coingecko_asset_platform_id}` +
        `?contract_addresses=${tokenArray
          .slice(startIndex, startIndex + 50)
          .toString()}&vs_currencies=usd`,
    );
    priceList = Object.keys(priceResponse.data).reduce(
      (obj: { [address: string]: number }, address: string) => {
        obj[address] = priceResponse.data[address]['usd'];
        return obj;
      },
      priceList,
    );
  }

  // Loop over `tokenArray` and print information.
  for (const token of tokenArray) {
    if (priceList[token]) {
      console.log(`Token ${token}'s price is ${priceList[token]}.`);
    } else {
      console.log(`Token ${token} doesn't have Coingecko price support.`);
    }
  }

  // Filter out pools involving tokens without price support.
  console.log(`Pool count before token price filtering: ${pools.length}`);
  pools = pools.filter(
    (pool) => priceList[pool.token0.id] && priceList[pool.token1.id],
  );
  console.log(`Pool count after token price filtering: ${pools.length}`);

  // See if current whitelist is all covered in the new list.
  const newWhitelistSet = new Set(pools.map((pool) => pool.id.toLowerCase()));
  for (const pool of currentWhitelist) {
    if (!newWhitelistSet.has(pool.id.toLowerCase())) {
      console.log(`Pool ${pool.id} is not on the new whitelist.`);
    } else {
      console.log(`Pool ${pool.id} is on the new whitelist.`);
    }
  }

  writeFileSync(
    `data/whitelistedSpecificPools-${chainId}.json`,
    JSON.stringify(pools, null, 2),
    'utf-8',
  );
  console.log(
    `Generated ${pools.length} whitelisted pools for chain id ${chainId}, involving ${tokens.size} tokens.`,
  );
}

fetchUniV3PoolsFromGeckoTerminal(
  'https://app.geckoterminal.com/api/p1/arbitrum/pools?dex=uniswap_v3_arbitrum',
).then((pools) =>
  generateWhitelistOfSpecificPools(
    ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID,
    pools.filter((pool) => pool[2] >= 10).map((pool) => pool[0]),
    whitelistedPoolsArbitrum,
  ),
);

fetchUniV3PoolsFromGeckoTerminal(
  'https://app.geckoterminal.com/api/p1/eth/pools?dex=uniswap_v3',
).then((pools) =>
  generateWhitelistOfSpecificPools(
    ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID,
    pools.filter((pool) => pool[2] >= 10).map((pool) => pool[0]),
    whitelistedPoolsEthereum,
  ),
);
