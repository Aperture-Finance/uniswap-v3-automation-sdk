import { Price, Token } from '@uniswap/sdk-core';
import {
  FeeAmount,
  Pool,
  computePoolAddress as _computePoolAddress,
  tickToPrice,
} from '@uniswap/v3-sdk';
import axios from 'axios';
import JSBI from 'jsbi';
import { Address, PublicClient, getContract } from 'viem';

import { getChainInfo } from './chain';
import { getToken } from './currency';
import {
  AllV3TicksQuery,
  FeeTierDistributionQuery,
} from './data/__graphql_generated__/uniswap-thegraph-types-and-hooks';
import { ApertureSupportedChainId } from './interfaces';
import { BasicPositionInfo } from './position';
import { sqrtRatioToPrice } from './tick';
import { IUniswapV3Pool__factory } from './typechain-types';

export type PoolKey = {
  token0: Address;
  token1: Address;
  fee: FeeAmount;
};

/**
 * Creates the pool key which is enough to compute the pool address
 * @param tokenA The first token of the pair, irrespective of sort order
 * @param tokenB The second token of the pair, irrespective of sort order
 * @param fee The fee tier of the pool
 * @returns The pool key
 */
export function getPoolKey(
  tokenA: Address,
  tokenB: Address,
  fee: FeeAmount,
): PoolKey {
  if (tokenA.toLowerCase() === tokenB.toLowerCase())
    throw new Error('IDENTICAL_ADDRESSES');
  return tokenA.toLowerCase() < tokenB.toLowerCase()
    ? { token0: tokenA, token1: tokenB, fee }
    : { token0: tokenB, token1: tokenA, fee };
}

/**
 * Computes a pool address
 * @param factoryAddress The Uniswap V3 factory address
 * @param token0 The first token of the pair, irrespective of sort order
 * @param token1 The second token of the pair, irrespective of sort order
 * @param fee The fee tier of the pool
 * @returns The pool address
 */
export function computePoolAddress(
  factoryAddress: Address,
  token0: Token | string,
  token1: Token | string,
  fee: FeeAmount,
): Address {
  return _computePoolAddress({
    factoryAddress,
    tokenA: new Token(
      1,
      typeof token0 === 'string' ? token0 : token0.address,
      18,
    ),
    tokenB: new Token(
      1,
      typeof token1 === 'string' ? token1 : token1.address,
      18,
    ),
    fee,
  }) as Address;
}

/**
 * Constructs a Uniswap SDK Pool object for the pool behind the specified position.
 * @param basicInfo Basic position info.
 * @param chainId Chain id.
 * @param publicClient Viem public client.
 * @returns The constructed Uniswap SDK Pool object where the specified position resides.
 */
export async function getPoolFromBasicPositionInfo(
  basicInfo: BasicPositionInfo,
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
): Promise<Pool> {
  return getPool(
    basicInfo.token0,
    basicInfo.token1,
    basicInfo.fee,
    chainId,
    publicClient,
  );
}

/**
 * Get the `IUniswapV3Pool` contract.
 */
export function getPoolContract(
  tokenA: Token | string,
  tokenB: Token | string,
  fee: FeeAmount,
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
) {
  return getContract({
    address: computePoolAddress(
      getChainInfo(chainId).uniswap_v3_factory,
      tokenA,
      tokenB,
      fee,
    ) as Address,
    abi: IUniswapV3Pool__factory.abi,
    publicClient,
  });
}

/**
 * Constructs a Uniswap SDK Pool object for an existing and initialized pool.
 * Note that the constructed pool's `token0` and `token1` will be sorted, but the input `tokenA` and `tokenB` don't have to be.
 * @param tokenA One of the tokens in the pool.
 * @param tokenB The other token in the pool.
 * @param fee Fee tier of the pool.
 * @param chainId Chain id.
 * @param publicClient Viem public client.
 * @returns The constructed Uniswap SDK Pool object.
 */
export async function getPool(
  tokenA: Token | string,
  tokenB: Token | string,
  fee: FeeAmount,
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
): Promise<Pool> {
  const poolContract = getPoolContract(
    tokenA,
    tokenB,
    fee,
    chainId,
    publicClient,
  );
  // If the specified pool has not been created yet, then the slot0() and liquidity() calls should fail (and throw an error).
  // Also update the tokens to the canonical type.
  const [slot0, inRangeLiquidity, tokenACanon, tokenBCanon] = await Promise.all(
    [
      poolContract.read.slot0(),
      poolContract.read.liquidity(),
      getToken(
        (typeof tokenA === 'string' ? tokenA : tokenA.address) as Address,
        chainId,
        publicClient,
      ),
      getToken(
        (typeof tokenB === 'string' ? tokenB : tokenB.address) as Address,
        chainId,
        publicClient,
      ),
    ],
  );
  const [sqrtPriceX96, tick] = slot0;
  if (sqrtPriceX96 === BigInt(0)) {
    throw 'Pool has been created but not yet initialized';
  }
  return new Pool(
    tokenACanon,
    tokenBCanon,
    fee,
    sqrtPriceX96.toString(),
    inRangeLiquidity.toString(),
    tick,
  );
}

/**
 * Get the price of `token0` in terms of `token1` in the pool.
 * @param pool A Uniswap v3 pool.
 * @returns The price of `token0` in terms of `token1` in the pool.
 */
export function getPoolPrice(pool: Pool): Price<Token, Token> {
  return sqrtRatioToPrice(pool.sqrtRatioX96, pool.token0, pool.token1);
}

/**
 * Fetches the TVL distribution of the different fee tiers behind the specified token pair.
 * Implementation heavily adapted from https://github.com/Uniswap/interface/blob/bd4042aa16cbd035f4b543272ef9ae301c96e8c9/src/hooks/useFeeTierDistribution.ts#L76.
 * @param chainId Chain id.
 * @param tokenA Address of one of the tokens in the pool.
 * @param tokenB Address of the other token in the pool.
 * @returns A record with four entries where the keys are the fee tiers and the values are the TVL fractions with the corresponding fee tiers.
 */
export async function getFeeTierDistribution(
  chainId: ApertureSupportedChainId,
  tokenA: Address,
  tokenB: Address,
): Promise<Record<FeeAmount, number>> {
  const subgraph_url = getChainInfo(chainId).uniswap_subgraph_url;
  if (subgraph_url === undefined) {
    throw 'Subgraph URL is not defined for the specified chain id';
  }
  const [token0, token1] = [tokenA.toLowerCase(), tokenB.toLowerCase()].sort();
  const feeTierTotalValueLocked: FeeTierDistributionQuery = (
    await axios.post(subgraph_url, {
      operationName: 'FeeTierDistribution',
      variables: {
        token0,
        token1,
      },
      query: `
        query FeeTierDistribution($token0: String!, $token1: String!) {
          _meta {
            block {
              number
            }
          }
          feeTierTVL: pools(
            orderBy: totalValueLockedToken0
            orderDirection: desc
            where: { token0: $token0, token1: $token1 }
          ) {
            feeTier
            totalValueLockedToken0
            totalValueLockedToken1
          }
        }`,
    })
  ).data.data;
  const feeTierToTVL = new Map<FeeAmount, number>();
  let sumTVL = 0;
  for (const feeTierTVL of feeTierTotalValueLocked.feeTierTVL) {
    const feeAmount = Number(feeTierTVL.feeTier) as FeeAmount;
    if (!(feeAmount in FeeAmount)) continue;
    const token0TVL = Number(feeTierTVL.totalValueLockedToken0 ?? 0);
    const token1TVL = Number(feeTierTVL.totalValueLockedToken1 ?? 0);
    feeTierToTVL.set(feeAmount, token0TVL + token1TVL);
    sumTVL += token0TVL + token1TVL;
  }
  const getFeeTierFraction = (feeAmount: FeeAmount): number => {
    return (feeTierToTVL.get(feeAmount) ?? 0) / sumTVL;
  };
  return {
    [FeeAmount.LOWEST]: getFeeTierFraction(FeeAmount.LOWEST),
    [FeeAmount.LOW]: getFeeTierFraction(FeeAmount.LOW),
    [FeeAmount.MEDIUM]: getFeeTierFraction(FeeAmount.MEDIUM),
    [FeeAmount.HIGH]: getFeeTierFraction(FeeAmount.HIGH),
  };
}

export type TickNumber = number;
export type LiquidityAmount = JSBI;
export type TickToLiquidityMap = Map<TickNumber, LiquidityAmount>;

/**
 * Fetches the liquidity for all ticks for the specified pool.
 * @param chainId Chain id.
 * @param pool The liquidity pool to fetch the tick to liquidity map for.
 * @returns A map from tick numbers to liquidity amounts for the specified pool.
 */
export async function getTickToLiquidityMapForPool(
  chainId: ApertureSupportedChainId,
  pool: Pool | PoolKey,
): Promise<TickToLiquidityMap> {
  const subgraph_url = getChainInfo(chainId).uniswap_subgraph_url;
  if (subgraph_url === undefined) {
    throw 'Subgraph URL is not defined for the specified chain id';
  }
  let rawData: AllV3TicksQuery['ticks'] = [];
  // Note that Uniswap subgraph returns a maximum of 1000 ticks per query, even if `numTicksPerQuery` is set to a larger value.
  const numTicksPerQuery = 1000;
  const chainInfo = getChainInfo(chainId);
  const poolAddress = computePoolAddress(
    chainInfo.uniswap_v3_factory,
    pool.token0,
    pool.token1,
    pool.fee,
  ).toLowerCase();
  for (let skip = 0; ; skip += numTicksPerQuery) {
    const response: AllV3TicksQuery | undefined = (
      await axios.post(subgraph_url, {
        operationName: 'AllV3Ticks',
        variables: {
          poolAddress,
          skip,
        },
        query: `
          query AllV3Ticks($poolAddress: String, $skip: Int!) {
            ticks(first: 1000, skip: $skip, where: { poolAddress: $poolAddress }, orderBy: tickIdx) {
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
    rawData.sort((a, b) => Number(a.tick) - Number(b.tick));
    let cumulativeLiquidity = JSBI.BigInt(0);
    for (const { tick, liquidityNet } of rawData) {
      cumulativeLiquidity = JSBI.add(
        cumulativeLiquidity,
        JSBI.BigInt(liquidityNet),
      );
      // There is a `Number.isInteger` check in `tickToPrice`.
      data.set(Math.floor(tick), cumulativeLiquidity);
    }
  }
  return data;
}

export interface Liquidity {
  liquidityActive: LiquidityAmount;
  price0: string;
  price1: string;
}

/**
 * Transform the tick to liquidity map into an array suitable for the UI.
 * @param chainId Chain id.
 * @param pool The liquidity pool to fetch the tick to liquidity map for.
 * @returns An array of liquidity objects.
 */
export async function getLiquidityArrayForPool(
  chainId: ApertureSupportedChainId,
  pool: Pool,
): Promise<Liquidity[]> {
  const token0 = pool.token0;
  const token1 = pool.token1;
  const tickToLiquidityMap = await getTickToLiquidityMapForPool(chainId, pool);
  const liquidityArray: Liquidity[] = [];
  tickToLiquidityMap.forEach((liquidity, tick) => {
    const price = tickToPrice(token0, token1, tick);
    liquidityArray.push({
      liquidityActive: liquidity,
      price0: price.toFixed(token0.decimals),
      price1: price.invert().toFixed(token1.decimals),
    });
  });
  return liquidityArray;
}
