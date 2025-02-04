// ts-node test/playground/decreaseLiquiditySingle4105824.ts
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
  PositionDetails,
  getDecreaseLiquiditySingleSwapInfo,
  getDecreaseLiquiditySingleTx,
  getPublicClient,
} from '../../src/viem';

async function main() {
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);
  const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
  const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
  const client = getPublicClient(chainId);
  const from = '0x1fFd5d818187917E0043522C3bE583A393c2BbF7';
  const tokenId = 4105824;
  const zeroForOne = true;
  const isUnwrapNative = true;
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
    liquidityPercentage: new Percent(10, 100), // position is $3.33 100%WETH. token0=weth, token1=usdc.. should take out $0.33 eth=.33/3116*1e18 token0amount = 1.06e14, $0.07 usdc
    slippageTolerance: new Percent(5, 1000),
    deadline: Math.floor(Date.now() / 1000 + 60 * 30),
    collectOptions: {
      expectedCurrencyOwed0: positionDetails.tokensOwed0,
      expectedCurrencyOwed1: positionDetails.tokensOwed1,
      recipient: from,
    },
  };
  const swapInfos = await getDecreaseLiquiditySingleSwapInfo(
    decreaseLiquidityOptions,
    chainId,
    amm,
    zeroForOne,
    from,
    /* tokenPricesUsd= */ ['1', '1'],
    client,
    isUnwrapNative,
    DEFAULT_SOLVERS,
    positionDetails,
  );
  for (const swapInfo of swapInfos) {
    const {
      solver,
      swapData,
      amount0,
      amount1,
      token0FeeAmount,
      token1FeeAmount,
    } = swapInfo;
    const txRequest = await getDecreaseLiquiditySingleTx(
      decreaseLiquidityOptions,
      zeroForOne,
      from,
      chainId,
      amm,
      client,
      swapData,
      positionDetails,
      /* amount0Min= */ amount0,
      /* amount1Min= */ amount1,
      /* token0FeeAmount= */ token0FeeAmount,
      /* token1FeeAmount= */ token1FeeAmount,
    );
    console.log(
      `solver=${solver}, liquidity: ${swapInfo.liquidity}, to=${txRequest.to}, from=${txRequest.from}, data=${txRequest.data}`,
    );
  }
  process.exit(0);
}

main();
