import { AllV3TicksQuery } from '@/data/__graphql_generated__/uniswap-thegraph-types-and-hooks';
import { ApertureSupportedChainId, getChainInfo } from '@/index';
import { Pool, TickMath } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import axios from 'axios';
import JSBI from 'jsbi';

import {
  LiquidityAmount,
  TickNumber,
  TickToLiquidityMap,
  computePoolAddress,
  normalizeTicks,
  reconstructLiquidityArray,
} from './pool';

/**
 * Fetches the liquidity for all ticks for the specified pool.
 * @param chainId Chain id.
 * @param pool The liquidity pool to fetch the tick to liquidity map for.
 * @param _tickLower The lower tick to fetch liquidity for, defaults to `TickMath.MIN_TICK`.
 * @param _tickUpper The upper tick to fetch liquidity for, defaults to `TickMath.MAX_TICK`.
 * @returns A map from tick numbers to liquidity amounts for the specified pool.
 */
export async function getTickToLiquidityMapForPool(
  chainId: ApertureSupportedChainId,
  pool: Pool,
  _tickLower = TickMath.MIN_TICK,
  _tickUpper = TickMath.MAX_TICK,
): Promise<TickToLiquidityMap> {
  const chainInfo = getChainInfo(chainId);
  const { factory } = chainInfo.amms[AutomatedMarketMakerEnum.Enum.UNISWAP_V3]!;
  const { uniswap_subgraph_url } = chainInfo;
  if (uniswap_subgraph_url === undefined) {
    throw 'Subgraph URL is not defined for the specified chain id';
  }
  const poolAddress = computePoolAddress(
    factory,
    pool.token0,
    pool.token1,
    pool.fee,
  ).toLowerCase();
  // Fetch current in-range liquidity from subgraph.
  const poolResponse = (
    await axios.post(uniswap_subgraph_url, {
      operationName: 'PoolLiquidity',
      variables: {},
      query: `
            query PoolLiquidity {
              pool(id: "${poolAddress}", subgraphError: allow) {
                liquidity
                tick
              }
            }`,
    })
  ).data.data.pool;
  // The current tick must be within the specified tick range.
  const { tickCurrentAligned, tickLower, tickUpper } = normalizeTicks(
    Number(poolResponse.tick),
    pool.tickSpacing,
    _tickLower,
    _tickUpper,
  );
  let rawData: AllV3TicksQuery['ticks'] = [];
  // Note that Uniswap subgraph returns a maximum of 1000 ticks per query, even if `numTicksPerQuery` is set to a larger value.
  const numTicksPerQuery = 1000;
  for (let skip = 0; ; skip += numTicksPerQuery) {
    const response: AllV3TicksQuery | undefined = (
      await axios.post(uniswap_subgraph_url, {
        operationName: 'AllV3Ticks',
        variables: {
          poolAddress,
          skip,
          tickLower,
          tickUpper,
        },
        query: `
            query AllV3Ticks($poolAddress: String, $skip: Int!, $tickLower: Int!, $tickUpper: Int!) {
              ticks(first: 1000, skip: $skip, where: { poolAddress: $poolAddress, tickIdx_gte: $tickLower, tickIdx_lte: $tickUpper }, orderBy: tickIdx, subgraphError: allow) {
                tick: tickIdx
                liquidityNet
              }
            }
          `,
      })
    ).data.data;
    const numItems = response?.ticks.length ?? 0;
    if (numItems > 0) {
      rawData = rawData.concat(response!.ticks);
    }
    // We fetch `numTicksPerQuery` items per query, so if we get less than that, then we know that we have fetched all the items.
    if (numItems < numTicksPerQuery) {
      break;
    }
  }
  const data = new Map<TickNumber, LiquidityAmount>();
  if (rawData.length > 0) {
    rawData.forEach((item) => {
      item.tick = Number(item.tick);
    });
    rawData.sort((a, b) => a.tick - b.tick);
    const liquidityArray = reconstructLiquidityArray(
      rawData,
      tickCurrentAligned,
      JSBI.BigInt(poolResponse.liquidity),
    );
    for (const [tick, liquidityActive] of liquidityArray) {
      // There is a `Number.isInteger` check in `tickToPrice`.
      data.set(Math.round(tick), JSBI.BigInt(liquidityActive));
    }
  }
  return data;
}
