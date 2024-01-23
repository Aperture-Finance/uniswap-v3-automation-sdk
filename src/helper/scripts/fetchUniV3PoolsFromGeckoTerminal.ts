import axios from 'axios';

export async function fetchUniV3PoolsFromGeckoTerminal(mainUrl: string) {
  // Columns are: poolAddress, poolName, swapCount24hrs, fromVolumeInUsd, toVolumeInUsd.
  const pools: [string, string, number, number, number][] = [];
  for (let page = 1; ; ++page) {
    const response = await axios.get(`${mainUrl}&page=${page}`);
    for (const pool of response.data.data) {
      const p = pool.attributes;
      pools.push([
        p.address,
        p.name,
        p.swap_count_24h,
        Number(p.from_volume_in_usd),
        Number(p.to_volume_in_usd),
      ]);
    }
    if (!response.data.links.next) {
      break;
    }
  }
  return pools;
}

fetchUniV3PoolsFromGeckoTerminal(
  'https://app.geckoterminal.com/api/p1/eth/pools?dex=uniswap_v3',
);

fetchUniV3PoolsFromGeckoTerminal(
  'https://app.geckoterminal.com/api/p1/arbitrum/pools?dex=uniswap_v3_arbitrum',
);

/*
Write pool data to CSV file:
writeFileSync(
  `data/uniswapV3Pools${networkName}.csv`,
  pools.join('\n'),
  'utf-8',
);
*/
