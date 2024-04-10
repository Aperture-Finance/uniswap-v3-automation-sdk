import { FeeAmount, Pool } from '@aperture_finance/uniswap-v3-sdk';
import { getAddress } from 'ethers/lib/utils';
import JSBI from 'jsbi';

import { ApertureSupportedChainId, DOUBLE_TICK } from '../../../src';
import {
  getFeeTierDistribution,
  getLiquidityArrayForPool,
  getPool,
  getPublicProvider,
  getTickToLiquidityMapForPool,
} from '../../../src/helper';
import { WBTC_ADDRESS, WETH_ADDRESS, amm, chainId, expect } from './common';

describe('Helper - Pool subgraph query tests', function () {
  it('Fee tier distribution', async function () {
    const [distribution, distributionOppositeTokenOrder] = await Promise.all([
      getFeeTierDistribution(chainId, WBTC_ADDRESS, WETH_ADDRESS),
      getFeeTierDistribution(chainId, WETH_ADDRESS, WBTC_ADDRESS),
    ]);
    expect(distribution).to.deep.equal(distributionOppositeTokenOrder);
    expect(
      Object.values(distribution).reduce(
        (partialSum, num) => partialSum + num,
        0,
      ),
    ).to.be.approximately(/*expected=*/ 1, /*delta=*/ 1e-9);
  });

  async function testLiquidityDistribution(
    chainId: ApertureSupportedChainId,
    pool: Pool,
  ) {
    const tickCurrentAligned =
      Math.floor(pool.tickCurrent / pool.tickSpacing) * pool.tickSpacing;
    const tickLower = pool.tickCurrent - DOUBLE_TICK;
    const tickUpper = pool.tickCurrent + DOUBLE_TICK;
    const [liquidityArr, tickToLiquidityMap] = await Promise.all([
      getLiquidityArrayForPool(chainId, pool, tickLower, tickUpper),
      getTickToLiquidityMapForPool(chainId, amm, pool, tickLower, tickUpper),
    ]);
    expect(liquidityArr.length).to.be.greaterThan(0);
    expect(tickToLiquidityMap.size).to.be.greaterThan(0);
    for (const liquidity of tickToLiquidityMap.values()) {
      expect(JSBI.greaterThanOrEqual(liquidity, JSBI.BigInt(0))).to.equal(true);
    }
    expect(
      liquidityArr[
        liquidityArr.findIndex(({ tick }) => tick > tickCurrentAligned) - 1
      ].liquidityActive,
    ).to.equal(pool.liquidity.toString());
  }

  it('Tick liquidity distribution - Ethereum mainnet', async function () {
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.LOW,
      chainId,
      amm,
      getPublicProvider(chainId),
    );
    await testLiquidityDistribution(chainId, pool);
  });

  it('Tick liquidity distribution - Arbitrum mainnet', async function () {
    const arbitrumChainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const WETH_ARBITRUM = getAddress(
      '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    );
    const USDC_ARBITRUM = getAddress(
      '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    );
    const pool = await getPool(
      WETH_ARBITRUM,
      USDC_ARBITRUM,
      FeeAmount.LOW,
      arbitrumChainId,
      amm,
      getPublicProvider(arbitrumChainId),
    );
    await testLiquidityDistribution(arbitrumChainId, pool);
  });
});
