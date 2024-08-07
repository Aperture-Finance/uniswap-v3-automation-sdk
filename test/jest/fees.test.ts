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
import { getFeeBips } from '../../src/viem/automan/getFees';
import { CollectableTokenAmounts } from '../../src/viem/position';
import assert from 'assert';

dotenvConfig();

describe('getFeeBips', () => {
  it('should return the min fee bips between both tokens', async () => {
    const chainId: ApertureSupportedChainId =
      ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const client = getPublicClient(
      chainId,
      `https://${getChainInfo(chainId).infura_network_id}-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    );
    const pool: Pool = await getPool(
      new Token(
        /*chainId=*/ 42161,
        /*address=*/ '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        /*decimals=*/ 18,
      ),
      new Token(
        /*chainId=*/ 42161,
        /*address=*/ '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        /*decimals=*/ 6,
      ),
      /*fee=*/ FeeAmount.LOW,
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
    let collectableTokenAmounts: CollectableTokenAmounts = {
      token0Amount: CurrencyAmount.fromRawAmount(
        new Token(
          /*chainId=*/ 42161,
          /*address=*/ '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
          /*decimals=*/ 18,
        ),
        123,
      ),
      token1Amount: CurrencyAmount.fromRawAmount(
        new Token(
          /*chainId=*/ 42161,
          /*address=*/ '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
          /*decimals=*/ 6,
        ),
        456,
      ),
    };
    console.log(`pool.sqrtRatioX96=${pool.sqrtRatioX96}, pool.token0Price=${pool.token0Price.toSignificant()}, pool.token1Price=${pool.token1Price.toSignificant()}`); // 3274.22, 0.000305416
    console.log(pool.token0Price.toSignificant());
    console.log(pool.liquidity.toString());
    console.log(pool.tickCurrent);
    console.log(`postion: ${position.liquidity}, ${position.tickLower}, ${position.tickUpper}`);
    assert(position.amount0.toSignificant() === '0.000000017476');
    assert(position.amount1.toSignificant() === '0.000057');
    assert(collectableTokenAmounts.token0Amount.toSignificant() === '0.000000000000000123');
    assert(collectableTokenAmounts.token1Amount.toSignificant() === '0.000456');
    // feeBips = min(lpCollectsFeesToken0 * rate / pricipalToken0, lpCollectsFeesToken0 * rate / pricipalToken0) * 1e18
    // feeBips = min(0.000000000000000123 * getAptrFee(FeeAmount.LOW) / 0.000000017476, 0.000456 * getAptrFee(FeeAmount.LOW) / 0.000057) * 1e18
    // feeBips = min(0.000000000000000123 * 0.001 / 0.000000017476, 0.000456 * 0.001 / 0.000057) * 1e18
    // feeBips = min(7.038e-12, 8.0e-3) * 1e18 = 7.038e-12 * 1e18 = 7.038e6
    const feeBips = getFeeBips(position, collectableTokenAmounts);
    expect(feeBips.toSignificant()).toBe('7038190');

    // collectableTokenAmounts = {
    //   token0Amount: CurrencyAmount.fromRawAmount(
    //     new Token(
    //       /*chainId=*/ 42161,
    //       /*address=*/ '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
    //       /*decimals=*/ 18,
    //     ),
    //     '123456789',
    //   ),
    //   token1Amount: CurrencyAmount.fromRawAmount(
    //     new Token(
    //       /*chainId=*/ 42161,
    //       /*address=*/ '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
    //       /*decimals=*/ 6,
    //     ),
    //     123,
    //   ),
    // };
    // console.log(collectableTokenAmounts.token0Amount);
    // console.log(collectableTokenAmounts.token0Amount.decimalScale.toString());
    // console.log(`amount0 = ${collectableTokenAmounts.token0Amount.toSignificant()}, ${collectableTokenAmounts.token0Amount}, amount1 = ${collectableTokenAmounts.token1Amount.toSignificant()}`);
    // const testTokenAmount = CurrencyAmount.fromRawAmount(
    //   new Token(
    //     /*chainId=*/ 42161,
    //     /*address=*/ '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
    //     /*decimals=*/ 18,
    //   ),
    //   '987654321',
    // );
    // // assert(collectableTokenAmounts.token0Amount.toSignificant() === '0.000000000123456789');
    // // assert(collectableTokenAmounts.token1Amount.toSignificant() === '0.000123');
  });

  it('should have different feeBips for different fee tier', async () => {
    const chainId: ApertureSupportedChainId =
      ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const client = getPublicClient(
      chainId,
      `https://${getChainInfo(chainId).infura_network_id}-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    );
    const positionLowFee: Position = new Position({
      pool: await getPool(
        new Token(
          /*chainId=*/ 42161,
          /*address=*/ '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          /*decimals=*/ 18,
        ),
        new Token(
          /*chainId=*/ 42161,
          /*address=*/ '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          /*decimals=*/ 6,
        ),
        /*fee=*/ 100,
        /*chainId=*/ 42161,
        /*amm=*/ AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
        client,
        /*blockNumber=*/ 237752500n,
      ),
      liquidity: JSBI.BigInt(1000000),
      tickLower: -887220,
      tickUpper: 52980,
    });
    const positionHighFee: Position = new Position({
      pool: await getPool(
        new Token(
          /*chainId=*/ 42161,
          /*address=*/ '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          /*decimals=*/ 18,
        ),
        new Token(
          /*chainId=*/ 42161,
          /*address=*/ '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          /*decimals=*/ 6,
        ),
        /*fee=*/ 10000,
        /*chainId=*/ 42161,
        /*amm=*/ AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
        client,
        /*blockNumber=*/ 237752500n,
      ),
      liquidity: JSBI.BigInt(1000000),
      tickLower: -887200,
      tickUpper: 53000,
    });
    const collectableTokenAmounts: CollectableTokenAmounts = {
      token0Amount: CurrencyAmount.fromRawAmount(
        new Token(
          /*chainId=*/ 42161,
          /*address=*/ '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          /*decimals=*/ 6,
        ),
        123,
      ),
      token1Amount: CurrencyAmount.fromRawAmount(
        new Token(
          /*chainId=*/ 42161,
          /*address=*/ '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          /*decimals=*/ 6,
        ),
        456,
      ),
    };
    const lowFeeBips = getFeeBips(positionLowFee, collectableTokenAmounts);
    expect(lowFeeBips).toBe(5600000000000000n);
    const highFeeBips = getFeeBips(positionHighFee, collectableTokenAmounts);
    expect(highFeeBips).toBe(12000000000000000n);
  });

  it('should still have fees if principal all in a token', async () => {
    const chainId: ApertureSupportedChainId =
      ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const client = getPublicClient(
      chainId,
      `https://${getChainInfo(chainId).infura_network_id}-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    );
    const position: Position = new Position({
      pool: await getPool(
        new Token(
          /*chainId=*/ 42161,
          /*address=*/ '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          /*decimals=*/ 18,
        ),
        new Token(
          /*chainId=*/ 42161,
          /*address=*/ '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          /*decimals=*/ 6,
        ),
        /*fee=*/ 500,
        /*chainId=*/ 42161,
        /*amm=*/ AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
        client,
        /*blockNumber=*/ 237752500n,
      ),
      liquidity: JSBI.BigInt(1e30),
      tickLower: -887220,
      tickUpper: -887200, // Small position range so the principal is all in one token.
    });
    expect(position.amount0.toSignificant()).toBe('0');
    expect(position.amount1.toSignificant()).toBe('54.3777');
    const collectableTokenAmounts: CollectableTokenAmounts = {
      token0Amount: CurrencyAmount.fromRawAmount(
        new Token(
          /*chainId=*/ 42161,
          /*address=*/ '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          /*decimals=*/ 6,
        ),
        123,
      ),
      token1Amount: CurrencyAmount.fromRawAmount(
        new Token(
          /*chainId=*/ 42161,
          /*address=*/ '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          /*decimals=*/ 6,
        ),
        456,
      ),
    };
    const lowFeeBips = getFeeBips(position, collectableTokenAmounts);
    expect(lowFeeBips).toBe(8385780000n);
  });
});
