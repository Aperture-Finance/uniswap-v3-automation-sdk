import { FeeAmount, nearestUsableTick } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { ethers } from 'hardhat';

import { ApertureSupportedChainId } from '../../../src';
import {
  PositionDetails,
  getNPM,
  getPool,
  getRebalancedPosition,
  increaseLiquidityOptimal,
  optimalMint,
  optimalRebalance,
} from '../../../src/helper';
import { eoa, expect } from './common';

describe('Helper - Routing tests', function () {
  // optimalMint is deprecated
  it.skip('Test optimalMint', async function () {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
    const provider = new ethers.providers.InfuraProvider(chainId);
    const token0 = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f';
    const token1 = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';
    const fee = FeeAmount.MEDIUM;
    const pool = await getPool(token0, token1, fee, chainId, amm);
    const token0Amount = CurrencyAmount.fromRawAmount(
      pool.token0,
      '1000000000',
    );
    const token1Amount = CurrencyAmount.fromRawAmount(
      pool.token1,
      '1000000000000000000',
    );
    const tickLower = nearestUsableTick(
      pool.tickCurrent - 10 * pool.tickSpacing,
      pool.tickSpacing,
    );
    const tickUpper = nearestUsableTick(
      pool.tickCurrent + 10 * pool.tickSpacing,
      pool.tickSpacing,
    );
    const { amount0, amount1 } = await optimalMint(
      chainId,
      amm,
      token0Amount,
      token1Amount,
      fee,
      tickLower,
      tickUpper,
      eoa,
      0.1,
      provider,
    );
    const _total = Number(
      pool.token0Price
        .quote(CurrencyAmount.fromRawAmount(pool.token0, amount0.toString()))
        .add(CurrencyAmount.fromRawAmount(pool.token1, amount1.toString()))
        .toFixed(),
    );
    const total = Number(
      pool.token0Price.quote(token0Amount).add(token1Amount).toFixed(),
    );
    expect(_total).to.be.closeTo(total, total * 0.005);
  });

  // TODO: Test failed when running all tests, but succeeded when running single test
  it.skip('Test increaseLiquidityOptimal', async function () {
    const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
    const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
    const provider = new ethers.providers.InfuraProvider(chainId);
    const positionId = 4;
    const { position, pool } = await PositionDetails.fromPositionId(
      chainId,
      amm,
      positionId,
      provider,
    );

    const token0Amount = CurrencyAmount.fromRawAmount(
      pool.token0,
      '10000000000000',
    );
    const token1Amount = CurrencyAmount.fromRawAmount(
      pool.token1,
      '1000000000000000000',
    );
    const { amount0, amount1 } = await increaseLiquidityOptimal(
      chainId,
      amm,
      provider,
      position,
      {
        tokenId: positionId,
        slippageTolerance: new Percent(50, 100),
        deadline: Math.floor(Date.now() / 1000 + 60 * 30),
      },
      token0Amount,
      token1Amount,
      eoa,
    );
    const _total = Number(
      pool.token0Price
        .quote(CurrencyAmount.fromRawAmount(pool.token0, amount0.toString()))
        .add(CurrencyAmount.fromRawAmount(pool.token1, amount1.toString()))
        .toFixed(),
    );
    const total = Number(
      pool.token0Price.quote(token0Amount).add(token1Amount).toFixed(),
    );
    expect(_total).to.be.closeTo(total, total * 0.03);
  });

  it('Test optimalRebalance', async function () {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
    const provider = new ethers.providers.InfuraProvider(chainId);
    const tokenId = 726230;
    const blockNumber = 119626480;
    const { pool, position } = await PositionDetails.fromPositionId(
      chainId,
      amm,
      tokenId,
      provider,
      blockNumber,
    );
    const tickLower = nearestUsableTick(
      pool.tickCurrent - 10 * pool.tickSpacing,
      pool.tickSpacing,
    );
    const tickUpper = nearestUsableTick(
      pool.tickCurrent + 10 * pool.tickSpacing,
      pool.tickSpacing,
    );
    const { liquidity } = await optimalRebalance(
      chainId,
      amm,
      tokenId,
      tickLower,
      tickUpper,
      0,
      true,
      await getNPM(chainId, amm, provider).ownerOf(tokenId),
      0.1,
      provider,
      blockNumber,
    );
    const { liquidity: predictedLiquidity } = getRebalancedPosition(
      position,
      tickLower,
      tickUpper,
    );
    expect(liquidity.toNumber()).to.be.closeTo(
      Number(predictedLiquidity.toString()),
      Number(predictedLiquidity.toString()) * 0.1,
    );
  });
});
