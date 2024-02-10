import { JsonRpcProvider } from '@ethersproject/providers';
import { CurrencyAmount } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';
import Big from 'big.js';
import { createPublicClient, http } from 'viem';

import { getChainInfo } from './chain';
import { ApertureSupportedChainId } from './interfaces';
import { getOptimalMintSwapInfo, getPool } from './viem';

async function debug() {
  const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
  const client = createPublicClient({
    chain: getChainInfo(chainId).chain,
    transport: http(
      'https://mainnet.infura.io/v3/[infura project id]',
    ),
  });
  const pool = await getPool(
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
    FeeAmount.LOWEST,
    ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID,
    client,
  );
  const amount0 = BigInt(new Big(10).pow(pool.token0.decimals).toFixed());
  const amount1 = BigInt(new Big(10).pow(pool.token1.decimals).toFixed());

  const res = await getOptimalMintSwapInfo(
    chainId,
    CurrencyAmount.fromRawAmount(pool.token0, amount0.toString()),
    CurrencyAmount.fromRawAmount(pool.token1, amount1.toString()),
    FeeAmount.LOWEST,
    -277278,
    -275271,
    '0xdC333239245ebBC6B656Ace7c08099AA415585d1',
    BigInt(Math.floor(Date.now() / 1000) + 60),
    0.5,
    client,
    new JsonRpcProvider(
      'https://mainnet.infura.io/v3/[infura project id]',
    ),
    true,
  );
  console.log(res);
}

debug();
