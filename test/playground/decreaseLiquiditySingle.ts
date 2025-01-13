// ts-node test/playground/decreaseLiquiditySingle.ts
import { RemoveLiquidityOptions } from '@aperture_finance/uniswap-v3-sdk';
import { Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';

import {
  ApertureSupportedChainId,
  ConsoleLogger,
  IOCKEY_LOGGER,
  ioc,
} from '../../src';
import {
  DEFAULT_SOLVERS,
  DecreaseLiquidityParams,
  PositionDetails,
  getDecreaseLiquiditySingleSwapInfoV3,
  getPublicClient,
} from '../../src/viem';

async function main() {
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);
  const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
  const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
  const client = getPublicClient(chainId);
  const from = '0x1fFd5d818187917E0043522C3bE583A393c2BbF7';
  const tokenId = 4063431;
  const positionDetails = await PositionDetails.fromPositionId(
    chainId,
    amm,
    BigInt(tokenId),
    client,
  );
  // token0 = weth = 0x82af49447d8a07e3bd95bd0d56f35241523fbab1
  // token1 = usdc = 0xaf88d065e77c8cc2239327c5edb3a432268e5831
  const decreaseLiquidityOptions: RemoveLiquidityOptions = {
    tokenId,
    liquidityPercentage: new Percent(10, 100), // position is $3.5 80%WETH. token0=weth, token1=usdc.. should taken out $0.35, $0.28 eth=.28/3277*1e18 token0amount = 8.5e13, $0.07 usdc. 64202, 92718273362833
    slippageTolerance: new Percent(5, 1000),
    deadline: Math.floor(Date.now() / 1000 + 60 * 30),
    collectOptions: {
      expectedCurrencyOwed0: positionDetails.tokensOwed0,
      expectedCurrencyOwed1: positionDetails.tokensOwed1,
      recipient: from,
    },
  };
  // fee in token0
  const zeroForOne = true;
  const swapInfos = await getDecreaseLiquiditySingleSwapInfoV3(
    decreaseLiquidityOptions,
    chainId,
    amm,
    zeroForOne,
    from,
    /* tokenPricesUsd= */ ['3225', '1'],
    client,
    DEFAULT_SOLVERS,
    positionDetails,
  );
  console.log(
    `swapInfos[0].liquidity: ${swapInfos[0].liquidity}, swapInfos[1].liquidity: ${swapInfos[1].liquidity}`,
  );
  process.exit(0);
}

main();
