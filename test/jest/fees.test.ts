// yarn
// yarn test:jest test/jest/fees.test.ts
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
  it('should return the min fee bips between both tokens', async () => {
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
    // feeBips = min(lpCollectsFeesToken0 * rate / pricipalToken0, lpCollectsFeesToken0 * rate / pricipalToken0) * 1e18
    // feeBips = min(0.000000000000000123 * getFeeReinvestRatio(FeeAmount.LOW) / 0.000000017476, 0.000456 * getFeeReinvestRatio(FeeAmount.LOW) / 0.000057) * 1e18
    // feeBips = min(0.000000000000000123 * 0.001 / 0.000000017476, 0.000456 * 0.001 / 0.000057) * 1e18
    // feeBips = min(7.038e-12, 8.0e-3) * 1e18 = 7.038e-12 * 1e18 = 7.038e6
    expect(getFeeReinvestBips(position, collectableTokenAmounts)).toBe(
      7038190n,
    );

    // Test less feesBips on token1.
    collectableTokenAmounts = {
      token0Amount: CurrencyAmount.fromRawAmount(token0, 123456789123456000),
      token1Amount,
    };
    expect(collectableTokenAmounts.token0Amount.toSignificant(18)).toBe(
      '0.123456789123456',
    );
    expect(collectableTokenAmounts.token1Amount.toSignificant()).toBe(
      '0.000456',
    );
    // feeBips = min(lpCollectsFeesToken0 * rate / pricipalToken0, lpCollectsFeesToken0 * rate / pricipalToken0) * 1e18
    // feeBips = min(0.123456789123456789 * getFeeReinvestRatio(FeeAmount.LOW) / 0.000000017476, 0.000001 * getFeeReinvestRatio(FeeAmount.LOW) / 0.000057) * 1e18
    // feeBips = min(0.123456789123456789 * 0.001 / 0.000000017476, 0.000456 * 0.001 / 0.000057) * 1e18
    // feeBips = min(7064, 0.008) * 1e18 = 0.008 * 1e18 = 8e15
    expect(getFeeReinvestBips(position, collectableTokenAmounts)).toBe(
      8000000000000000n,
    );

    // Test slightly less feesBips on token0.
    // 0.000456 * 0.001 / 0.000057 * 0.000000017476 / 0.001 = 1.39808e-7.
    collectableTokenAmounts = {
      token0Amount: CurrencyAmount.fromRawAmount(token0, 139808000000),
      token1Amount,
    };
    expect(collectableTokenAmounts.token0Amount.toSignificant()).toBe(
      '0.000000139808',
    );
    expect(getFeeReinvestBips(position, collectableTokenAmounts)).toBe(
      7999962480377385n,
    );

    // Test equal feeBips on both tokens.
    collectableTokenAmounts = {
      token0Amount: CurrencyAmount.fromRawAmount(token0, 139808700000),
      token1Amount,
    };
    expect(collectableTokenAmounts.token0Amount.toSignificant()).toBe(
      '0.000000139808',
    );
    expect(getFeeReinvestBips(position, collectableTokenAmounts)).toBe(
      8000000000000000n,
    );
  });

  it('should have different feeBips for different fee tier', async () => {
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
    // feeBips = min(lpCollectsFeesToken0 * rate / pricipalToken0, lpCollectsFeesToken0 * rate / pricipalToken0) * 1e18
    // feeBips = min(0.000000000000000123 * 0.0007 * 1e18 / 0.0000000174754, 0.000456 * 0.0007 * 1e18 / 0.000057)
    // feeBips = min(4926913, 5.6e15) = 4926913
    expect(lowFeeBips).toBe(4926913n);

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
    // feeBips = min(lpCollectsFeesToken0 * rate / pricipalToken0, lpCollectsFeesToken0 * rate / pricipalToken0) * 1e18
    // feeBips = min(0.000000000000000123 * 0.0015 * 1e18 / 0.0000000174754, 0.000456 * 0.0015 * 1e18 / 0.000057)
    // feeBips = min(10546013, 5.1.2e16) = 4926913
    expect(getFeeReinvestBips(positionHighFee, collectableTokenAmounts)).toBe(
      10546013n,
    );
  });

  it('should still have fees if principal all in a token', async () => {
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
    // 0.000456 * 0.001 * 1e18 / 54.3777 = 8385785255
    expect(getFeeReinvestBips(token1Position, collectableTokenAmounts)).toBe(
      8385785255n,
    );

    const token0Position: Position = new Position({
      pool,
      liquidity: JSBI.BigInt(1e6),
      tickLower: 52980,
      tickUpper: 53000, // Range on right of price, so the principal is all in token0.
    });
    expect(token0Position.amount0.toSignificant()).toBe('0.00000000000000007');
    expect(token0Position.amount1.toSignificant()).toBe('0');
    // 0.000000000000000123 * 0.001 * 1e18 / 0.00000000000000007 = 1.757e15
    expect(getFeeReinvestBips(token0Position, collectableTokenAmounts)).toBe(
      1757142857142857n,
    );
  });

  it('should not be greater than MAX_FEE_PIPS', async () => {
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
    console.log(collectableTokenAmounts.token0Amount.toSignificant());
    console.log(collectableTokenAmounts.token1Amount.toSignificant());
    expect(collectableTokenAmounts.token0Amount.toSignificant()).toBe(
      '999999', // Should be 1e6, but rounding error.
    );
    expect(collectableTokenAmounts.token1Amount.toSignificant()).toBe(
      '1000000',
    );
    // feeBips = min(lpCollectsFeesToken0 * rate / pricipalToken0, lpCollectsFeesToken0 * rate / pricipalToken0) * 1e18
    // feeBips = min(999999 * 0.001 * 1e18 / 0.0000000174754, 1000000 * 0.001 * 1e18 / 0.000057)
    // feeBips = min(5.7e28, 1.754e25) = 1.754e25
    expect(getFeeReinvestBips(position, collectableTokenAmounts)).toBe(
      BigInt(MAX_FEE_PIPS),
    );
  });
});
