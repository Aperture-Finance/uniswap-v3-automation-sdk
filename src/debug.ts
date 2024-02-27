import { CurrencyAmount } from '@uniswap/smart-order-router';
import { FeeAmount, Position, nearestUsableTick } from '@uniswap/v3-sdk';
import { createPublicClient, http } from 'viem';

import { getChainInfo } from './chain';
import { CustomInfuraProvider } from './helper';
import { ApertureSupportedChainId } from './interfaces';
import { getOptimalMintSwapInfo, getPool } from './viem';

async function main() {
  const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
  const WETH_ADDRESS = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619';
  const eoa = '0x8B18687Ed4e32A5E1a3DeE91C08f706C196bb9C5';
  const chainId = ApertureSupportedChainId.POLYGON_MAINNET_CHAIN_ID;
  const publicClient = createPublicClient({
    chain: getChainInfo(chainId).chain,
    transport: http(
      'https://polygon-mainnet.infura.io/v3/ed76135a4bf344ad9e001278b776d5c0',
    ),
  });
  const provider = new CustomInfuraProvider(chainId);
  const pool = await getPool(
    USDC_ADDRESS,
    WETH_ADDRESS,
    FeeAmount.LOW,
    chainId,
    publicClient,
  );
  const tickLower = nearestUsableTick(
    pool.tickCurrent - 10 * pool.tickSpacing,
    pool.tickSpacing,
  );
  const tickUpper = nearestUsableTick(
    pool.tickCurrent + 10 * pool.tickSpacing,
    pool.tickSpacing,
  );
  const hypotheticalPosition = new Position({
    pool,
    liquidity: '1000000000',
    tickLower,
    tickUpper,
  });
  const t = await getOptimalMintSwapInfo(
    chainId,
    hypotheticalPosition.amount0,
    CurrencyAmount.fromRawAmount(pool.token1, '0'),
    FeeAmount.LOW,
    tickLower,
    tickUpper,
    eoa,
    BigInt(Math.floor(Date.now() / 1000) + 60),
    0.05,
    publicClient,
    provider,
    // 1inch quote currently doesn't support the no-swap case.
    true,
  );
  console.log(t);
}

main();
