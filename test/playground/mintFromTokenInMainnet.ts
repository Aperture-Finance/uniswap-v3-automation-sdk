// ts-node test/playground/mintFromTokenInMainnet.ts
import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';

import {
  ApertureSupportedChainId,
  ConsoleLogger,
  IOCKEY_LOGGER,
  ioc,
} from '../../src';
import {
  getPool,
  getPublicClient,
  getToken,
  mintFromTokenIn,
} from '../../src/viem';

async function main() {
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);
  const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
  const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
  const publicClient = getPublicClient(chainId);
  const from = '0x1fFd5d818187917E0043522C3bE583A393c2BbF7';
  const token0Address = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'; // usdc
  const token1Address = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // weth
  const tokenInAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7'; // usdt
  const [tokenIn, pool] = await Promise.all([
    getToken(tokenInAddress, chainId, publicClient),
    getPool(
      token0Address,
      token1Address,
      FeeAmount.LOW,
      chainId,
      amm,
      publicClient,
    ),
  ]);
  // swap tokenIn for tokenA. then get optimalSwap to tokenB.
  await mintFromTokenIn(
    amm,
    chainId,
    publicClient,
    from,
    pool,
    /* tickLower= */ -198370,
    /* tickUpper= */ -196950,
    tokenIn,
    /* tokenInAmount= */ 1000000000n, // $1000
    /* slippage=0.5%= */ 0.005,
    /* tokenInPriceUsd= */ '1',
  );
  await mintFromTokenIn(
    amm,
    chainId,
    publicClient,
    from,
    pool,
    /* tickLower= */ -196950,
    /* tickUpper= */ -194950,
    tokenIn,
    /* tokenInAmount= */ 1000000000n, // $1000
    /* slippage=0.5%= */ 0.005,
    /* tokenInPriceUsd= */ '1',
  );
  process.exit(0);
}

main();
