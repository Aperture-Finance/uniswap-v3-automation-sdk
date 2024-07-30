// yarn test:jest test/jest/rebalance.test.ts
import { FeeAmount, nearestUsableTick } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';

import { ActionTypeEnum, ApertureSupportedChainId } from '../../src/interfaces';
import { normalizeTicks } from '../../src/rebalance';
import { rangeWidthRatioToTicks } from '../../src/tick';
import { getToken } from '../../src/viem/currency/currency';
import { getPool } from '../../src/viem/pool';

const ETHEREUM_MAINNET_ETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const ETHEREUM_MAINNET_USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

describe('normalizeTicks', () => {
  it('should return the nearest usable normalized tick range for Rebalance', async () => {
    const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
    const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
    const action = {
      type: ActionTypeEnum.enum.Rebalance,
      slippage: 0.05,
      maxGasProportion: 0.1,
      tickLower: -100,
      tickUpper: 100,
    };
    const [tokenA, tokenB] = await Promise.all([
      getToken(ETHEREUM_MAINNET_ETH, chainId),
      getToken(ETHEREUM_MAINNET_USDC, chainId),
    ]);
    const pool = await getPool(tokenA, tokenB, FeeAmount.LOW, chainId, amm);

    const { tickLower, tickUpper } = normalizeTicks(action, pool);

    expect(tickLower).toBe(nearestUsableTick(-100, pool.tickSpacing));
    expect(tickUpper).toBe(nearestUsableTick(100, pool.tickSpacing));
  });

  it('should return the nearest usable normalized tick range for RecurringPrice', async () => {
    const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
    const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
    const action = {
      type: ActionTypeEnum.enum.RecurringPercentage,
      slippage: 0.05,
      maxGasProportion: 0.1,
      tickLowerOffset: -100,
      tickUpperOffset: 100,
    };
    const [tokenA, tokenB] = await Promise.all([
      getToken(ETHEREUM_MAINNET_ETH, chainId),
      getToken(ETHEREUM_MAINNET_USDC, chainId),
    ]);
    const pool = await getPool(tokenA, tokenB, FeeAmount.LOW, chainId, amm);

    const { tickLower, tickUpper } = normalizeTicks(action, pool);

    expect(tickLower).toBe(
      nearestUsableTick(pool.tickCurrent - 100, pool.tickSpacing),
    );
    expect(tickUpper).toBe(
      nearestUsableTick(pool.tickCurrent + 100, pool.tickSpacing),
    );
  });

  it('should return the nearest usable normalized tick range for RecurringDualAction, lteAction and gteAction are the same type', async () => {
    // Setup.
    const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
    const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
    const lteOffset = 50;
    const gteOffset = 100;
    const action = {
      type: ActionTypeEnum.enum.RecurringDualAction,
      slippage: 0.05,
      maxGasProportion: 0.1,
      lteAction: {
        tickLowerOffset: -lteOffset,
        tickUpperOffset: lteOffset,
      },
      gteAction: {
        tickLowerOffset: -gteOffset,
        tickUpperOffset: gteOffset,
      },
    };
    const [tokenA, tokenB] = await Promise.all([
      getToken(ETHEREUM_MAINNET_ETH, chainId),
      getToken(ETHEREUM_MAINNET_USDC, chainId),
    ]);
    const pool = await getPool(tokenA, tokenB, FeeAmount.LOW, chainId, amm);

    // Tests.
    const { tickLower, tickUpper } = normalizeTicks(action, pool);
    const lteNormalizeTicks = normalizeTicks(action, pool, /*isLte=*/ true);
    const [lteTickLower, lteTickUpper] = [
      lteNormalizeTicks.tickLower,
      lteNormalizeTicks.tickUpper,
    ];
    const gteNormalizeTicks = normalizeTicks(action, pool, /*isLte=*/ false);
    const [gteTickLower, gteTickUpper] = [
      gteNormalizeTicks.tickLower,
      gteNormalizeTicks.tickUpper,
    ];

    // Verify tickLower and tickUpper.
    expect(tickLower).not.toBe(tickUpper);
    expect(tickLower).toBe(
      nearestUsableTick(pool.tickCurrent - lteOffset, pool.tickSpacing),
    );
    expect(tickUpper).toBe(
      nearestUsableTick(pool.tickCurrent + lteOffset, pool.tickSpacing),
    );

    // Verify lteTickLower and lteTickUpper.
    expect(tickLower).toBe(lteTickLower);
    expect(tickUpper).toBe(lteTickUpper);

    // Verify gteTickLower and gteTickUpper.
    expect(gteTickLower).not.toBe(gteTickUpper);
    expect(gteTickLower).not.toBe(lteTickLower);
    expect(gteTickUpper).not.toBe(lteTickUpper);
    expect(gteTickLower).toBe(
      nearestUsableTick(pool.tickCurrent - gteOffset, pool.tickSpacing),
    );
    expect(gteTickUpper).toBe(
      nearestUsableTick(pool.tickCurrent + gteOffset, pool.tickSpacing),
    );
  });

  it('should return the nearest usable normalized tick range for RecurringDualAction, lteAction and gteAction are different types', async () => {
    // Setup.
    const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
    const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
    const lteOffset = 50;
    const action = {
      type: ActionTypeEnum.enum.RecurringDualAction,
      slippage: 0.05,
      maxGasProportion: 0.1,
      lteAction: {
        tickLowerOffset: -lteOffset,
        tickUpperOffset: lteOffset,
      },
      gteAction: {
        tickRangeWidth: 10,
        token0ValueProportion: '0.5',
      },
    };
    const [tokenA, tokenB] = await Promise.all([
      getToken(ETHEREUM_MAINNET_ETH, chainId),
      getToken(ETHEREUM_MAINNET_USDC, chainId),
    ]);
    const pool = await getPool(tokenA, tokenB, FeeAmount.LOW, chainId, amm);

    // Tests.
    const { tickLower, tickUpper } = normalizeTicks(action, pool);
    const lteNormalizeTicks = normalizeTicks(action, pool, /*isLte=*/ true);
    const [lteTickLower, lteTickUpper] = [
      lteNormalizeTicks.tickLower,
      lteNormalizeTicks.tickUpper,
    ];
    const gteNormalizeTicks = normalizeTicks(action, pool, /*isLte=*/ false);
    const [gteTickLower, gteTickUpper] = [
      gteNormalizeTicks.tickLower,
      gteNormalizeTicks.tickUpper,
    ];

    // Verify tickLower and tickUpper.
    expect(tickLower).not.toBe(tickUpper);
    expect(tickLower).toBe(
      nearestUsableTick(pool.tickCurrent - lteOffset, pool.tickSpacing),
    );
    expect(tickUpper).toBe(
      nearestUsableTick(pool.tickCurrent + lteOffset, pool.tickSpacing),
    );

    // Verify lteTickLower and lteTickUpper.
    expect(tickLower).toBe(lteTickLower);
    expect(tickUpper).toBe(lteTickUpper);

    // Verify gteTickLower and gteTickUpper.
    expect(gteTickLower).not.toBe(gteTickUpper);
    expect(gteTickLower).not.toBe(lteTickLower);
    expect(gteTickUpper).not.toBe(lteTickUpper);
    const expectedGteNormalizeTicks = rangeWidthRatioToTicks(
      action.gteAction.tickRangeWidth,
      pool.tickCurrent,
      new Big(action.gteAction.token0ValueProportion),
    );
    const [expectedGteTickLower, expectedGteTickUpper] = [
      expectedGteNormalizeTicks.tickLower,
      expectedGteNormalizeTicks.tickUpper,
    ];
    expect(gteTickLower).toBe(
      nearestUsableTick(expectedGteTickLower, pool.tickSpacing),
    );
    expect(gteTickUpper).toBe(
      nearestUsableTick(expectedGteTickUpper, pool.tickSpacing),
    );
  });
});
