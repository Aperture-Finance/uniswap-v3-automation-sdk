import { FeeAmount, nearestUsableTick } from '@aperture_finance/uniswap-v3-sdk';
import '@nomicfoundation/hardhat-viem';
import { CurrencyAmount } from '@uniswap/smart-order-router';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';

import { ApertureSupportedChainId } from '../../../src';
import {
  PositionDetails,
  getNPM,
  getPool,
  getRebalancedPosition,
  optimalMint,
  optimalRebalance,
} from '../../../src/viem';
import { UNIV3_AMM, eoa, expect, getInfuraClient } from '../common';

describe('Routing tests', function () {
  it('Test optimalRebalance', async function () {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const publicClient = getInfuraClient('arbitrum-mainnet');
    const tokenId = 726230n;
    const blockNumber = 119626480n;
    const { pool, position } = await PositionDetails.fromPositionId(
      chainId,
      UNIV3_AMM,
      tokenId,
      publicClient,
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
    const owner = await getNPM(chainId, UNIV3_AMM, publicClient).read.ownerOf([
      tokenId,
    ]);
    const { liquidity } = await optimalRebalance(
      chainId,
      UNIV3_AMM,
      tokenId,
      tickLower,
      tickUpper,
      0n,
      true,
      owner,
      0.1,
      publicClient,
      blockNumber,
    );
    const { liquidity: predictedLiquidity } = getRebalancedPosition(
      position,
      tickLower,
      tickUpper,
    );
    expect(Number(liquidity.toString())).to.be.closeTo(
      Number(predictedLiquidity.toString()),
      Number(predictedLiquidity.toString()) * 0.1,
    );
  });

  it('Test optimalMint', async function () {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
    const publicClient = getInfuraClient('arbitrum-mainnet');
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
      publicClient,
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
});
