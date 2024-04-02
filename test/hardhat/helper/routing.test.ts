import { FeeAmount, nearestUsableTick } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Percent } from '@uniswap/sdk-core';
import { ethers } from 'hardhat';

import { ApertureSupportedChainId } from '../../../src';
import {
  PositionDetails,
  checkAutomationSupportForPool,
  checkTokenLiquidityAgainstChainNativeCurrency,
  fetchQuoteFromRoutingApi,
  fetchQuoteFromSpecifiedRoutingApiInfo,
  getNPM,
  getPool,
  getPublicProvider,
  getRebalancedPosition,
  getToken,
  increaseLiquidityOptimal,
  optimalMint,
  optimalRebalance,
  optimalZapOut,
} from '../../../src/helper';
import { eoa, expect } from './common';

describe('Helper - Routing tests', function () {
  it('Fetch quote swapping 1 ETH for USDC on mainnet', async function () {
    const quote = await fetchQuoteFromRoutingApi(
      ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID,
      'ETH',
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC mainnet
      '1000000000000000000',
      'exactIn',
    );
    expect(quote.amountDecimals === '1');
    expect(Number(quote.quoteDecimals)).to.be.greaterThan(0);
    console.log(`1 ETH -> ${quote.quoteDecimals} USDC`);
  });

  it('Fetch quote swapping 1 ETH for USDC on Manta Pacific testnet', async function () {
    const quote = await fetchQuoteFromSpecifiedRoutingApiInfo(
      3441005 as ApertureSupportedChainId,
      {
        url: 'https://uniswap-routing.aperture.finance/quote',
        type: 'ROUTING_API',
      },
      'ETH',
      '0x39471BEe1bBe79F3BFA774b6832D6a530edDaC6B',
      '1000000000000000000',
      'exactIn',
    );
    expect(quote.amountDecimals === '1');
    expect(Number(quote.quoteDecimals)).to.be.greaterThan(0);
    console.log(`1 ETH -> ${quote.quoteDecimals} USDC`);
  });

  it('Fetch quote swapping 1 USDC for ETH on Scroll mainnet', async function () {
    const quote = await fetchQuoteFromRoutingApi(
      ApertureSupportedChainId.SCROLL_MAINNET_CHAIN_ID,
      '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4', // USDC on Scroll
      'ETH',
      '1000000',
      'exactIn',
    );
    expect(quote.amountDecimals === '1');
    expect(Number(quote.quoteDecimals)).to.be.greaterThan(0);
    console.log(`1 USDC -> ${quote.quoteDecimals} ETH`);
  });

  it('Test optimalMint', async function () {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const provider = new ethers.providers.InfuraProvider(chainId);
    const token0 = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f';
    const token1 = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';
    const fee = FeeAmount.MEDIUM;
    const pool = await getPool(token0, token1, fee, chainId);
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
    const provider = new ethers.providers.InfuraProvider(chainId);
    const positionId = 4;
    const { position, pool } = await PositionDetails.fromPositionId(
      chainId,
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
    const provider = new ethers.providers.InfuraProvider(chainId);
    const tokenId = 726230;
    const blockNumber = 119626480;
    const { pool, position } = await PositionDetails.fromPositionId(
      chainId,
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
      tokenId,
      tickLower,
      tickUpper,
      0,
      true,
      await getNPM(chainId, provider).ownerOf(tokenId),
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

  it('Test optimal zap out', async function () {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const provider = new ethers.providers.InfuraProvider(chainId);
    const tokenId = 726230;
    const { amount } = await optimalZapOut(
      chainId,
      tokenId,
      false,
      1e12,
      await getNPM(chainId, provider).ownerOf(tokenId),
      0.1,
      provider,
    );
    console.log('zap out amount', amount.toString());
  });

  it('Test automation eligiblity', async function () {
    const avaxProvider = getPublicProvider(
      ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID,
    );
    const [SHIBe, USDC, WAVAX] = await Promise.all([
      getToken(
        '0x02D980A0D7AF3fb7Cf7Df8cB35d9eDBCF355f665',
        ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID,
        avaxProvider,
      ),
      getToken(
        '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID,
        avaxProvider,
      ),
      getToken(
        '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
        ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID,
        avaxProvider,
      ),
    ]);
    expect(
      await checkTokenLiquidityAgainstChainNativeCurrency(
        ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID,
        SHIBe.address,
      ),
    ).to.equal('-1');
    expect(
      await checkTokenLiquidityAgainstChainNativeCurrency(
        ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID,
        USDC.address,
      ),
    ).to.not.equal('-1');
    expect(
      await checkTokenLiquidityAgainstChainNativeCurrency(
        ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID,
        WAVAX.address,
      ),
    ).to.equal('1');
    expect(await checkAutomationSupportForPool(SHIBe, WAVAX)).to.equal(false);
  });
});
