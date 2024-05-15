import { FeeAmount, nearestUsableTick } from '@aperture_finance/uniswap-v3-sdk';
import '@nomicfoundation/hardhat-viem';
import { Percent } from '@uniswap/sdk-core';
import { CurrencyAmount } from '@uniswap/smart-order-router';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';

import {
  ApertureSupportedChainId,
  UniswapSupportedChainId,
  WBTC_ARBITRUM_ONE,
  WRAPPED_NATIVE_CURRENCY,
} from '../../../src';
import {
  E_Solver,
  PositionDetails,
  getNPM,
  getPool,
  getRebalancedPosition,
  increaseLiquidityOptimal,
  optimalMint,
  optimalMintV2,
  optimalRebalance,
  optimalRebalanceV2,
} from '../../../src/viem';
import {
  UNIV3_AMM,
  WBTC_ADDRESS,
  WETH_ADDRESS,
  eoa,
  expect,
  getInfuraClient,
} from '../common';

describe('Viem - Routing tests', function () {
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
    const resultV1 = await optimalRebalance(
      chainId,
      UNIV3_AMM,
      tokenId,
      tickLower,
      tickUpper,
      0n,
      /** usePool= */ true, // don't use 1inch in unit test
      owner,
      0.1,
      publicClient,
      blockNumber,
    );

    const { liquidity, swapPath, priceImpact } = resultV1;

    const { liquidity: predictedLiquidity } = getRebalancedPosition(
      position,
      tickLower,
      tickUpper,
    );
    expect(Number(liquidity.toString())).to.be.closeTo(
      Number(predictedLiquidity.toString()),
      Number(predictedLiquidity.toString()) * 0.1,
    );

    expect(Number(priceImpact!.toString())).to.be.closeTo(0.000523, 0.00005);

    expect(swapPath!.tokenIn).to.equal(pool.token0.address);
    expect(swapPath!.tokenOut).to.equal(pool.token1.address);
  });

  // can pass when run alone, but fail when run with other tests, skip it currently
  it.skip('Test optimalRebalanceV2 in mainnet', async function () {
    const tokenId = 4n;
    const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
    const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
    const publicClient = getInfuraClient();
    const blockNumber = await publicClient.getBlockNumber();
    const { pool } = await PositionDetails.fromPositionId(
      chainId,
      amm,
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
    const owner = await getNPM(chainId, amm, publicClient).read.ownerOf([
      tokenId,
    ]);

    const resultV2 = await optimalRebalanceV2(
      chainId,
      amm,
      tokenId,
      tickLower,
      tickUpper,
      0n,
      owner,
      0.1,
      publicClient,
      blockNumber,
    );

    // console.log(
    //   JSON.stringify(resultV2, (key, value) => {
    //     // Convert BigInt to string
    //     if (typeof value === 'bigint') {
    //       return value.toString();
    //     }
    //     return value;
    //   }),
    // );

    expect(resultV2.length).to.be.greaterThan(0);
    expect(resultV2.map((r) => r.solver)).to.be.include(E_Solver.PH); // should include PH
    for (let i = 0; i < resultV2.length; i++) {
      expect(Number(resultV2[i].amount0.toString())).to.be.greaterThan(0);
      expect(Number(resultV2[i].amount1.toString())).to.be.greaterThan(0);
      expect(Number(resultV2[i].liquidity.toString())).to.be.greaterThan(0);

      expect(resultV2[i].swapData!).to.be.not.empty;
      expect(resultV2[i].swapRoute?.length).to.be.greaterThan(0);
      expect(resultV2[i].swapPath!.tokenIn).to.equal(pool.token1.address);
      expect(resultV2[i].swapPath!.tokenOut).to.equal(pool.token0.address);
      expect(Number(resultV2[i].swapPath!.minAmountOut)).to.closeTo(
        Number(resultV2[i].swapPath?.amountOut.toString()),
        Number(resultV2[i].swapPath?.amountOut.toString()) * 0.1,
      );
    }
  });

  it('Test optimalRebalanceV2 in arbitrum', async function () {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const publicClient = getInfuraClient('arbitrum-mainnet');
    const tokenId = 726230n;
    const blockNumber = await publicClient.getBlockNumber();
    const { pool } = await PositionDetails.fromPositionId(
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

    const resultV2 = await optimalRebalanceV2(
      chainId,
      UNIV3_AMM,
      tokenId,
      tickLower,
      tickUpper,
      0n,
      owner,
      0.1,
      publicClient,
      blockNumber,
    );

    expect(resultV2.length).to.be.greaterThan(0);
    expect(resultV2.map((r) => r.solver)).to.be.not.include(E_Solver.PH); // PH not support in arbitrum
  });

  it('Test increaseLiquidityOptimal with pool', async function () {
    const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
    const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
    const publicClient = getInfuraClient();
    const blockNumber = 19866218n;

    const { position, pool } = await PositionDetails.fromPositionId(
      chainId,
      amm,
      4n,
      publicClient,
      blockNumber,
    );

    const token0Amount = CurrencyAmount.fromRawAmount(
      pool.token0,
      '10000000000000',
    );
    const token1Amount = CurrencyAmount.fromRawAmount(
      pool.token1,
      '1000000000000000000',
    );

    const { amount0, amount1, priceImpact, swapPath } =
      await increaseLiquidityOptimal(
        chainId,
        amm,
        publicClient,
        position,
        {
          tokenId: 4,
          slippageTolerance: new Percent(5, 1000),
          deadline: Math.floor(Date.now() / 1000 + 60 * 30),
        },
        token0Amount,
        token1Amount,
        eoa,
        true, //don't use 1inch in unit test
        blockNumber,
        true /** includeSwapInfo */,
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

    expect(Number(priceImpact!.toString())).to.be.closeTo(0.2224, 0.01);

    expect(swapPath!.tokenIn).to.equal(pool.token0.address);
    expect(swapPath!.tokenOut).to.equal(pool.token1.address);
  });

  it('Test optimalMint', async function () {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
    const publicClient = getInfuraClient('arbitrum-mainnet');
    const token0 = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f';
    const token1 = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';
    const fee = FeeAmount.MEDIUM;

    const blockNumber = 205912340n;

    const pool = await getPool(
      token0,
      token1,
      fee,
      chainId,
      amm,
      publicClient,
      blockNumber,
    );

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
    const { amount0, amount1, priceImpact, swapPath } = await optimalMint(
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
      true, // don't use 1inch in unit test
      blockNumber,
      true /** includeSwapInfo */,
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

    expect(amount0.toString()).to.be.equal('684889078');
    expect(amount1.toString()).to.be.equal('61653987834490876385');
    expect(Number(priceImpact!.toString())).to.be.closeTo(0.0142255, 0.001);
    expect(swapPath!.tokenIn).to.equal(pool.token0.address);
    expect(swapPath!.tokenOut).to.equal(pool.token1.address);
  });

  // can pass when run alone, but fail when run with other tests, skip it currently
  it.skip('Test optimalMintV2 in mainnet', async function () {
    const tokenId = 4n;
    const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
    const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
    const publicClient = getInfuraClient();
    const blockNumber = await publicClient.getBlockNumber();
    const { pool } = await PositionDetails.fromPositionId(
      chainId,
      amm,
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

    const token0Amount = CurrencyAmount.fromRawAmount(
      pool.token0,
      '1000000000',
    );
    const token1Amount = CurrencyAmount.fromRawAmount(
      pool.token1,
      '1000000000000000000',
    );
    const fee = FeeAmount.MEDIUM;

    const resultV2 = await optimalMintV2(
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
      blockNumber,
    );

    // console.log(
    //   JSON.stringify(resultV2, (key, value) => {
    //     // Convert BigInt to string
    //     if (typeof value === 'bigint') {
    //       return value.toString();
    //     }
    //     return value;
    //   }),
    // );

    expect(resultV2.length).to.be.greaterThan(0);
    expect(resultV2.map((r) => r.solver)).to.be.include(E_Solver.PH); // should include PH
    for (let i = 0; i < resultV2.length; i++) {
      expect(Number(resultV2[i].amount0.toString())).to.be.greaterThan(0);
      expect(Number(resultV2[i].amount1.toString())).to.be.greaterThan(0);
      expect(Number(resultV2[i].liquidity.toString())).to.be.greaterThan(0);

      expect(resultV2[i].swapData!).to.be.not.empty;
      expect(resultV2[i].swapRoute?.length).to.be.greaterThan(0);
      expect(resultV2[i].swapPath!.tokenIn).to.equal(WBTC_ADDRESS);
      expect(resultV2[i].swapPath!.tokenOut).to.equal(WETH_ADDRESS);
      expect(Number(resultV2[i].swapPath!.minAmountOut)).to.closeTo(
        Number(resultV2[i].swapPath?.amountOut.toString()),
        Number(resultV2[i].swapPath?.amountOut.toString()) * 0.1,
      );
    }
  });

  it('Test optimalMintV2 in arbitrum', async function () {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
    const publicClient = getInfuraClient('arbitrum-mainnet');
    const token0 = WBTC_ARBITRUM_ONE.address;
    const token1 =
      WRAPPED_NATIVE_CURRENCY[UniswapSupportedChainId.ARBITRUM_ONE]!.address;
    const fee = FeeAmount.MEDIUM;

    const blockNumber = await publicClient.getBlockNumber();

    const pool = await getPool(
      token0,
      token1,
      fee,
      chainId,
      amm,
      publicClient,
      blockNumber,
    );

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
    const resultV2 = await optimalMintV2(
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
      blockNumber,
    );

    expect(resultV2.map((r) => r.solver)).to.be.not.include(E_Solver.PH); // should not include PH
  });
});
