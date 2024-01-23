import { ApertureSupportedChainId, DOUBLE_TICK } from '@/index';
import { Provider } from '@ethersproject/abstract-provider';
import { Pool, tickToPrice } from '@uniswap/v3-sdk';
import { EphemeralGetPopulatedTicksInRange__factory } from 'aperture-lens';
import { PoolUtils } from 'aperture-lens/dist/typechain/contracts/EphemeralGetPopulatedTicksInRange';

import { getPublicProvider } from '../provider';
import { normalizeTicks, reconstructLiquidityArray } from './pool';

export interface Liquidity {
  tick: number;
  liquidityActive: string;
  price0: string;
  price1: string;
}
/**
 * Fetches the liquidity within the tick range for the specified pool.
 * @param chainId Chain id.
 * @param pool The liquidity pool to fetch the tick to liquidity map for.
 * @param _tickLower The lower tick to fetch liquidity for, defaults to half of the current price.
 * @param _tickUpper The upper tick to fetch liquidity for, defaults to twice of the current price.
 * @param provider Ethers provider.
 * @returns An array of liquidity objects.
 */
export async function getLiquidityArrayForPool(
  chainId: ApertureSupportedChainId,
  pool: Pool,
  _tickLower = pool.tickCurrent - DOUBLE_TICK,
  _tickUpper = pool.tickCurrent + DOUBLE_TICK,
  provider?: Provider,
): Promise<Liquidity[]> {
  // The current tick must be within the specified tick range.
  const { tickCurrentAligned, tickLower, tickUpper } = normalizeTicks(
    pool.tickCurrent,
    pool.tickSpacing,
    _tickLower,
    _tickUpper,
  );
  const { token0, token1 } = pool;
  const populatedTicks = await getPopulatedTicksInRange(
    chainId,
    pool,
    tickLower,
    tickUpper,
    provider,
  );
  const liquidityArray = reconstructLiquidityArray(
    populatedTicks,
    tickCurrentAligned,
    pool.liquidity,
  );
  return liquidityArray.map(([tick, liquidityActive]) => {
    const price = tickToPrice(token0, token1, tick);
    return {
      tick,
      liquidityActive,
      price0: price.toFixed(token0.decimals),
      price1: price.invert().toFixed(token1.decimals),
    };
  });
}

/**
 * Fetches the liquidity within the tick range for the specified pool by deploying an ephemeral contract via `eth_call`.
 * Each tick consumes about 100k gas, so this method may fail if the number of ticks exceeds 3k assuming the provider
 * gas limit is 300m.
 * @param chainId Chain id.
 * @param pool The liquidity pool to fetch the tick to liquidity map for.
 * @param tickLower The lower tick to fetch liquidity for.
 * @param tickUpper The upper tick to fetch liquidity for.
 * @param provider Ethers provider.
 */
async function getPopulatedTicksInRange(
  chainId: ApertureSupportedChainId,
  pool: Pool,
  tickLower: number,
  tickUpper: number,
  provider?: Provider,
) {
  // Deploy the ephemeral contract to query the liquidity within the specified tick range.
  const returnData = await (provider ?? getPublicProvider(chainId)).call(
    new EphemeralGetPopulatedTicksInRange__factory().getDeployTransaction(
      Pool.getAddress(pool.token0, pool.token1, pool.fee),
      tickLower,
      tickUpper,
    ),
  );
  const iface = EphemeralGetPopulatedTicksInRange__factory.createInterface();
  return iface.decodeFunctionResult(
    'getPopulatedTicksInRange',
    returnData,
  )[0] as PoolUtils.PopulatedTickStructOutput[];
}
