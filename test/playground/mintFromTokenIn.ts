// ts-node test/playground/mintFromTokenIn.ts
import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';

import {
  ApertureSupportedChainId,
  ConsoleLogger,
  IOCKEY_LOGGER,
  ioc,
} from '../../src';
import {
  getMintFromTokenInSwapInfo,
  getMintFromTokenInTx,
  getPool,
  getPublicClient,
  getToken,
} from '../../src/viem';

async function main() {
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);
  const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
  const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
  const publicClient = getPublicClient(chainId);
  const from = '0x1fFd5d818187917E0043522C3bE583A393c2BbF7';
  const token0Address = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1'; // weth
  const token1Address = '0xaf88d065e77c8cc2239327c5edb3a432268e5831'; // usdc
  const tokenInAddress = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9'; // usdt
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
  const [tickLower, tickUpper] = [-198370, -196950];
  const slippage = 0.005; // 0.5%
  const swapInfos = await getMintFromTokenInSwapInfo(
    amm,
    chainId,
    publicClient,
    from,
    pool,
    tickLower,
    tickUpper,
    tokenIn,
    /* tokenInAmount= */ 1000000000n, // $1000
    slippage,
    /* tokenInPriceUsd= */ '1',
  );
  for (const swapInfo of swapInfos) {
    const {
      solver,
      solver1,
      swapData,
      swapData1,
      amount0,
      amount1,
      token0FeeAmount,
      token1FeeAmount,
      liquidity,
    } = swapInfo;
    const txRequest = (
      await getMintFromTokenInTx(
        amm,
        chainId,
        /* recipient= */ from,
        pool,
        tickLower,
        tickUpper,
        tokenIn,
        /* tokenInAmountToSwapToToken0= */ amount0,
        /* tokenInAmountToSwapToToken1= */ amount1,
        /* tokenInFeeAmount= */ (token0FeeAmount ?? 0n) +
          (token1FeeAmount ?? 0n),
        /* swapData0= */ swapData,
        swapData1 ?? '0x',
        liquidity,
        slippage,
        /* deadline= */ BigInt(Math.floor(Date.now() / 1000 + 60 * 30)),
      )
    ).tx;
    console.log(
      `solver=${solver}, solver1=${solver1}, liquidity: ${swapInfo.liquidity}, txRequest=${JSON.stringify(txRequest)}`,
    );
  }
  process.exit(0);
}

main();
