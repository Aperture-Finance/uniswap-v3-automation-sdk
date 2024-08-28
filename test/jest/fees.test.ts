// yarn
// yarn test:jest test/jest/fees.test.ts
// TODO: Fix test cases from refactoring.
import { FeeAmount, Pool, Position } from '@aperture_finance/uniswap-v3-sdk';
import { Token } from '@uniswap/sdk-core';
import { CurrencyAmount } from '@uniswap/smart-order-router';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { config as dotenvConfig } from 'dotenv';
import JSBI from 'jsbi';

import { ApertureSupportedChainId, getChainInfo } from '../../src';
import { getPool, getPublicClient } from '../../src/viem';
import {
  MAX_FEE_PIPS,
  getFeeReinvestBips,
  getFeeReinvestRatio,
} from '../../src/viem/automan/getFees';
import { CollectableTokenAmounts } from '../../src/viem/position';

dotenvConfig();

describe('getFeeBips', () => {
  const token0 = new Token(
    /*chainId=*/ 42161,
    /*address=*/ '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
    /*decimals=*/ 18,
  );
  const token1 = new Token(
    /*chainId=*/ 42161,
    /*address=*/ '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
    /*decimals=*/ 6,
  );
  it.skip('should return the min fee bips between both tokens', async () => {
    const chainId: ApertureSupportedChainId =
      ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const client = getPublicClient(
      chainId,
      `https://${getChainInfo(chainId).infura_network_id}-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    );
    const pool: Pool = await getPool(
      token0,
      token1,
      FeeAmount.LOW,
      /*chainId=*/ 42161,
      /*amm=*/ AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
      client,
      /*blockNumber=*/ 237752500n,
    );
    const position: Position = new Position({
      pool,
      liquidity: JSBI.BigInt(1000000),
      tickLower: -887220,
      tickUpper: 52980,
    });
    const token1Amount = CurrencyAmount.fromRawAmount(token1, 456);

    // Test less feesBips on token0.
    let collectableTokenAmounts: CollectableTokenAmounts = {
      token0Amount: CurrencyAmount.fromRawAmount(token0, 123),
      token1Amount,
    };
    expect(position.amount0.toSignificant()).toBe('0.000000017476');
    expect(position.amount1.toSignificant()).toBe('0.000057');
    expect(collectableTokenAmounts.token0Amount.toSignificant()).toBe(
      '0.000000000000000123',
    );
    expect(collectableTokenAmounts.token1Amount.toSignificant()).toBe(
      '0.000456',
    );
    // Hardcode an expected value to check to sanity check changing the default reinvest ratio fee.
    // feeBips = min(lpCollectsFeesToken0 * rate * 1e18 / pricipalToken0, lpCollectsFeesToken0 * rate * 1e18 / pricipalToken0)
    // feeBips = min(0.000000000000000123 * getFeeReinvestRatio(FeeAmount.LOW) * 1e18 / 0.000000017476, 0.000456 * getFeeReinvestRatio(FeeAmount.LOW) * 1e18 / 0.000057)
    // feeBips = min(0.000000000000000123 * 0.03 * 1e18 / 0.000000017476, 0.000456 * 0.03 * 1e18 / 0.000057)
    // feeBips = min(211146715, 2.4e17) = 211146715
    expect(getFeeReinvestBips(position, collectableTokenAmounts)).toBe(
      211145725n, // Last few digits are off due to rounding.
    );
    expect(
      Number(getFeeReinvestBips(position, collectableTokenAmounts)),
    ).toBeCloseTo(
      Math.min(
        (0.000000000000000123 *
          getFeeReinvestRatio(FeeAmount.LOW) *
          MAX_FEE_PIPS) /
          0.000000017476,
        (0.000456 * getFeeReinvestRatio(FeeAmount.LOW) * MAX_FEE_PIPS) /
          0.000057,
      ),
      -6, // Allow the last 6 digits to be different due to rounding, acceptable since MAX_FEE_PIPS is 18 decimals.
    );

    // Test less feesBips on token1.
    collectableTokenAmounts = {
      token0Amount: CurrencyAmount.fromRawAmount(token0, 123456789123456000),
      token1Amount,
    };
    expect(collectableTokenAmounts.token0Amount.toSignificant(18)).toBe(
      '0.123456789123456',
    );
    expect(
      Number(getFeeReinvestBips(position, collectableTokenAmounts)),
    ).toBeCloseTo(
      Math.min(
        (0.123456789123456 *
          getFeeReinvestRatio(FeeAmount.LOW) *
          MAX_FEE_PIPS) /
          0.000000017476,
        (0.000456 * getFeeReinvestRatio(FeeAmount.LOW) * MAX_FEE_PIPS) /
          0.000057,
      ),
      -6, // Allow the last 6 digits to be different due to rounding, acceptable since MAX_FEE_PIPS is 18 decimals.
    );

    // Test equal feeBips on both tokens.
    collectableTokenAmounts = {
      token0Amount: CurrencyAmount.fromRawAmount(token0, 139808700000),
      token1Amount,
    };
    expect(collectableTokenAmounts.token0Amount.toSignificant()).toBe(
      '0.000000139808',
    );
    expect(
      Number(getFeeReinvestBips(position, collectableTokenAmounts)),
    ).toBeCloseTo(
      Math.min(
        (0.000000139808 * getFeeReinvestRatio(FeeAmount.LOW) * MAX_FEE_PIPS) /
          0.000000017476,
        (0.000456 * getFeeReinvestRatio(FeeAmount.LOW) * MAX_FEE_PIPS) /
          0.000057,
      ),
      -6, // Allow the last 6 digits to be different due to rounding, acceptable since MAX_FEE_PIPS is 18 decimals.
    );
  });

  it.skip('should have different feeBips for different fee tier', async () => {
    const chainId: ApertureSupportedChainId =
      ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const client = getPublicClient(
      chainId,
      `https://${getChainInfo(chainId).infura_network_id}-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    );
    const collectableTokenAmounts: CollectableTokenAmounts = {
      token0Amount: CurrencyAmount.fromRawAmount(token0, 123),
      token1Amount: CurrencyAmount.fromRawAmount(token1, 456),
    };

    const positionLowFee: Position = new Position({
      pool: await getPool(
        token0,
        token1,
        FeeAmount.LOWEST,
        /*chainId=*/ 42161,
        /*amm=*/ AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
        client,
        /*blockNumber=*/ 237752500n,
      ),
      liquidity: JSBI.BigInt(1e6),
      tickLower: -887220,
      tickUpper: 52980,
    });
    expect(positionLowFee.amount0.toSignificant()).toBe('0.0000000174754');
    expect(positionLowFee.amount1.toSignificant()).toBe('0.000057');
    const lowFeeBips = getFeeReinvestBips(
      positionLowFee,
      collectableTokenAmounts,
    );
    expect(Number(lowFeeBips)).toBeCloseTo(
      Math.min(
        (0.000000000000000123 *
          getFeeReinvestRatio(FeeAmount.LOWEST) *
          MAX_FEE_PIPS) /
          0.0000000174754,
        (0.000456 * getFeeReinvestRatio(FeeAmount.LOWEST) * MAX_FEE_PIPS) /
          0.000057,
      ),
      -6, // Allow the last 6 digits to be different due to rounding, acceptable since MAX_FEE_PIPS is 18 decimals.
    );

    const positionHighFee: Position = new Position({
      pool: await getPool(
        token0,
        token1,
        FeeAmount.HIGH,
        /*chainId=*/ 42161,
        /*amm=*/ AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
        client,
        /*blockNumber=*/ 237752500n,
      ),
      liquidity: JSBI.BigInt(1e6),
      tickLower: -887200,
      tickUpper: 53000,
    });
    expect(positionHighFee.amount0.toSignificant()).toBe('0.0000000174947');
    expect(positionHighFee.amount1.toSignificant()).toBe('0.000057');
    expect(Number(lowFeeBips)).toBeCloseTo(
      Math.min(
        (0.000000000000000123 *
          getFeeReinvestRatio(FeeAmount.HIGH) *
          MAX_FEE_PIPS) /
          0.0000000174947,
        (0.000456 * getFeeReinvestRatio(FeeAmount.HIGH) * MAX_FEE_PIPS) /
          0.000057,
      ),
      -6, // Allow the last 6 digits to be different due to rounding, acceptable since MAX_FEE_PIPS is 18 decimals.
    );
  });

  it.skip('should still have fees if principal all in a token', async () => {
    const chainId: ApertureSupportedChainId =
      ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const client = getPublicClient(
      chainId,
      `https://${getChainInfo(chainId).infura_network_id}-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    );
    const pool = await getPool(
      token0,
      token1,
      FeeAmount.LOW,
      /*chainId=*/ 42161,
      /*amm=*/ AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
      client,
      /*blockNumber=*/ 237752500n,
    );
    const collectableTokenAmounts: CollectableTokenAmounts = {
      token0Amount: CurrencyAmount.fromRawAmount(token0, 123),
      token1Amount: CurrencyAmount.fromRawAmount(token1, 456),
    };
    expect(collectableTokenAmounts.token0Amount.toSignificant()).toBe(
      '0.000000000000000123',
    );
    expect(collectableTokenAmounts.token1Amount.toSignificant()).toBe(
      '0.000456',
    );

    const token1Position: Position = new Position({
      pool,
      liquidity: JSBI.BigInt(1e30),
      tickLower: -887220,
      tickUpper: -887200, // Range on left of price, so the principal is all in token1.
    });
    expect(token1Position.amount0.toSignificant()).toBe('0');
    expect(token1Position.amount1.toSignificant()).toBe('54.3777');
    expect(
      Number(getFeeReinvestBips(token1Position, collectableTokenAmounts)),
    ).toBeCloseTo(
      (0.000456 * getFeeReinvestRatio(FeeAmount.LOW) * MAX_FEE_PIPS) / 54.3777,
      -6, // Allow the last 6 digits to be different due to rounding, acceptable since MAX_FEE_PIPS is 18 decimals.
    );

    const token0Position: Position = new Position({
      pool,
      liquidity: JSBI.BigInt(1e6),
      tickLower: 52980,
      tickUpper: 53000, // Range on right of price, so the principal is all in token0.
    });
    expect(token0Position.amount0.toSignificant()).toBe('0.00000000000000007');
    expect(token0Position.amount1.toSignificant()).toBe('0');
    expect(
      Number(getFeeReinvestBips(token0Position, collectableTokenAmounts)),
    ).toBeCloseTo(
      (0.000000000000000123 *
        getFeeReinvestRatio(FeeAmount.LOW) *
        MAX_FEE_PIPS) /
        0.00000000000000007,
      -6, // Allow the last 6 digits to be different due to rounding, acceptable since MAX_FEE_PIPS is 18 decimals.
    );
  });

  it.skip('should not be greater than MAX_FEE_PIPS', async () => {
    const chainId: ApertureSupportedChainId =
      ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const client = getPublicClient(
      chainId,
      `https://${getChainInfo(chainId).infura_network_id}-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    );
    const pool = await getPool(
      token0,
      token1,
      FeeAmount.LOW,
      /*chainId=*/ 42161,
      /*amm=*/ AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
      client,
      /*blockNumber=*/ 237752500n,
    );
    const position: Position = new Position({
      pool,
      liquidity: JSBI.BigInt(1000000),
      tickLower: -887220,
      tickUpper: 52980,
    });
    expect(position.amount0.toSignificant()).toBe('0.000000017476');
    expect(position.amount1.toSignificant()).toBe('0.000057');
    const collectableTokenAmounts: CollectableTokenAmounts = {
      token0Amount: CurrencyAmount.fromRawAmount(token0, 1e24),
      token1Amount: CurrencyAmount.fromRawAmount(token1, 1e12),
    };
    expect(collectableTokenAmounts.token0Amount.toSignificant()).toBe(
      '999999', // Should be 1e6, but rounding error.
    );
    expect(collectableTokenAmounts.token1Amount.toSignificant()).toBe(
      '1000000',
    );
    const feeReinvestBips = getFeeReinvestBips(
      position,
      collectableTokenAmounts,
    );
    expect(feeReinvestBips).toBeLessThan(
      Math.min(
        (999999 * getFeeReinvestRatio(FeeAmount.LOW) * MAX_FEE_PIPS) /
          0.000000017476,
        (1000000 * getFeeReinvestRatio(FeeAmount.LOW) * MAX_FEE_PIPS) /
          0.000057,
      ),
    );
    expect(feeReinvestBips).toBe(BigInt(MAX_FEE_PIPS));
  });
});
