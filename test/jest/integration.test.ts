import { FeeAmount, TICK_SPACINGS } from '@uniswap/v3-sdk';
import axios from 'axios';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import JSBI from 'jsbi';
import { getAddress } from 'viem';

import { getChainInfo } from '../../chain';
import { ApertureSupportedChainId } from '../../interfaces';
import {
  getFeeTierDistribution,
  getLiquidityArrayForPool,
  getPool,
  getTickToLiquidityMapForPool,
} from '../../pool';
import { getPublicClient } from '../../public_client';
import { readTickToLiquidityMap } from '../../tick';

chai.use(chaiAsPromised);
const expect = chai.expect;
const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

describe('Pool subgraph query tests', function () {
  it('Fee tier distribution', async function () {
    const [distribution, distributionOppositeTokenOrder] = await Promise.all([
      getFeeTierDistribution(chainId, WBTC_ADDRESS, WETH_ADDRESS),
      getFeeTierDistribution(chainId, WETH_ADDRESS, WBTC_ADDRESS),
    ]);
    expect(distribution).deep.equal(distributionOppositeTokenOrder);
    expect(
      Object.values(distribution).reduce(
        (partialSum, num) => partialSum + num,
        0,
      ),
    ).to.be.approximately(/*expected=*/ 1, /*delta=*/ 1e-9);
  });

  it('Tick liquidity distribution - Ethereum mainnet', async function () {
    const publicClient = getPublicClient(chainId);
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.LOW,
      chainId,
      publicClient,
    );
    const tickToLiquidityMap = await getTickToLiquidityMapForPool(
      chainId,
      pool,
    );
    expect(tickToLiquidityMap.size).to.be.greaterThan(0);
    for (const liquidity of tickToLiquidityMap.values()) {
      expect(JSBI.greaterThanOrEqual(liquidity, JSBI.BigInt(0))).to.equal(true);
    }

    // Fetch current in-range liquidity from subgraph.
    const chainInfo = getChainInfo(chainId);
    const poolResponse = (
      await axios.post(chainInfo.uniswap_subgraph_url!, {
        operationName: 'PoolLiquidity',
        variables: {},
        query: `
          query PoolLiquidity {
            pool(id: "0x4585fe77225b41b697c938b018e2ac67ac5a20c0") {
              liquidity
              tick
            }
          }`,
      })
    ).data.data.pool;
    const inRangeLiquidity = JSBI.BigInt(poolResponse.liquidity);
    const tickSpacing = TICK_SPACINGS[FeeAmount.LOW];
    const tickCurrentAligned =
      Math.floor(Number(poolResponse.tick) / tickSpacing) * tickSpacing;
    expect(
      JSBI.equal(
        inRangeLiquidity,
        readTickToLiquidityMap(tickToLiquidityMap, tickCurrentAligned)!,
      ),
    ).to.equal(true);
    const liquidityArr = await getLiquidityArrayForPool(chainId, pool);
    expect(
      liquidityArr.some((element) =>
        JSBI.equal(element.liquidityActive, inRangeLiquidity),
      ),
    ).to.be.true;
  });

  it('Tick liquidity distribution - Arbitrum mainnet', async function () {
    const arbitrumChainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const publicClient = getPublicClient(arbitrumChainId);
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
      publicClient,
    );
    const tickToLiquidityMap = await getTickToLiquidityMapForPool(
      arbitrumChainId,
      pool,
    );
    expect(tickToLiquidityMap.size).to.be.greaterThan(0);
    for (const liquidity of tickToLiquidityMap.values()) {
      expect(JSBI.greaterThanOrEqual(liquidity, JSBI.BigInt(0))).to.equal(true);
    }

    // Fetch current in-range liquidity from subgraph.
    const chainInfo = getChainInfo(arbitrumChainId);
    const poolResponse = (
      await axios.post(chainInfo.uniswap_subgraph_url!, {
        operationName: 'PoolLiquidity',
        variables: {},
        query: `
          query PoolLiquidity {
            pool(id: "0xc31e54c7a869b9fcbecc14363cf510d1c41fa443") {
              liquidity
              tick
            }
          }`,
      })
    ).data.data.pool;
    const inRangeLiquidity = JSBI.BigInt(poolResponse.liquidity);
    const tickSpacing = TICK_SPACINGS[FeeAmount.LOW];
    const tickCurrentAligned =
      Math.floor(Number(poolResponse.tick) / tickSpacing) * tickSpacing;
    expect(
      JSBI.equal(
        inRangeLiquidity,
        readTickToLiquidityMap(tickToLiquidityMap, tickCurrentAligned)!,
      ),
    ).to.equal(true);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
  }, 20000);
});
