// ts-node test/playground/decreaseLiquidityToTokenOut4105824ToWETH.ts
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
  getDecreaseLiquidityToTokenOutSwapInfo,
  getDecreaseLiquidityToTokenOutTx,
  getPublicClient,
} from '../../src/viem';

async function main() {
    ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);
    const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const publicClient = getPublicClient(chainId);
    const from = '0x1fFd5d818187917E0043522C3bE583A393c2BbF7';
    const tokenId = 4105824;
    const tokenOut = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'; // weth
    const isUnwrapNative = true;
    const positionDetails = await PositionDetails.fromPositionId(
      chainId,
      amm,
      BigInt(tokenId),
      publicClient,
    );
    const decreaseLiquidityOptions: RemoveLiquidityOptions = {
      tokenId,
      liquidityPercentage: new Percent(100, 100), // position is $2.15 50%USDC, 50%DAI.
      slippageTolerance: new Percent(5, 1000), // 0.5% slippage
      deadline: Math.floor(Date.now() / 1000 + 60 * 30),
      collectOptions: {
        expectedCurrencyOwed0: positionDetails.tokensOwed0,
        expectedCurrencyOwed1: positionDetails.tokensOwed1,
        recipient: from,
      },
    };
    const swapInfos = await getDecreaseLiquidityToTokenOutSwapInfo(
        amm,
        chainId,
        publicClient,
        from,
        positionDetails,
      decreaseLiquidityOptions,
      tokenOut,
      isUnwrapNative,
      /* tokenPricesUsd= */ ['1', '1'],
      DEFAULT_SOLVERS,
    );
    for (const swapInfo of swapInfos) {
      const {
        solver,
        amount0,
        amount1,
        liquidity,
        swapData,
        swapData1,
        token0FeeAmount,
        token1FeeAmount,
      } = swapInfo;
      const txRequest = await getDecreaseLiquidityToTokenOutTx(
        amm,
        chainId,
        from,
        positionDetails,
        decreaseLiquidityOptions,
        tokenOut,
        /* tokenOutMin= */ liquidity,
        /* token0FeeAmount= */ token0FeeAmount!,
        /* token1FeeAmount= */ token1FeeAmount!,
        /* swapData0= */ swapData,
        swapData1!,
        isUnwrapNative
      );
      console.log(
        `solver=${solver}, liquidity: ${swapInfo.liquidity}, to=${txRequest.to}, from=${txRequest.from}, data=${txRequest.data}, amount0=${amount0}, amount1=${amount1}, token0FeeAmount=${token0FeeAmount}, token1FeeAmount=${token1FeeAmount}, 
        positionDetails.amount0=${positionDetails.position.amount0.toFixed(0)}, 
        positionDetails.amount0=${positionDetails.position.amount0.quotient}, 
        positionDetails.amount0=${positionDetails.position.amount0.numerator}, 
        positionDetails.amount0=${positionDetails.position.amount0.denominator}, 
        positionDetails.amount1=${positionDetails.position.amount1.toFixed(0)}, 
        positionDetails.amount1=${positionDetails.position.amount1.quotient}, 
        positionDetails.amount1=${positionDetails.position.amount1.numerator}, 
        positionDetails.amount1=${positionDetails.position.amount1.denominator}, 
        positionDetails.amount0Owed=${positionDetails.tokensOwed0.toFixed(0)}, 
        positionDetails.amount0Owed=${positionDetails.tokensOwed0.quotient}, 
        positionDetails.amount0Owed=${positionDetails.tokensOwed0.numerator}, 
        positionDetails.amount0Owed=${positionDetails.tokensOwed0.denominator}, 
        positionDetails.amount1Owed=${positionDetails.tokensOwed1.toFixed(0)}, 
        positionDetails.amount1Owed=${positionDetails.tokensOwed1.toFixed(5)}, 
        positionDetails.amount1Owed=${positionDetails.tokensOwed1.toSignificant()}, 
        positionDetails.amount1Owed=${positionDetails.tokensOwed1.toSignificant(5)}, 
        positionDetails.amount1Owed=${positionDetails.tokensOwed1.quotient}, 
        positionDetails.amount1Owed=${positionDetails.tokensOwed1.numerator}, 
        positionDetails.amount1Owed=${positionDetails.tokensOwed1.denominator}, `,
      );
    }
    process.exit(0);
  }
  
  main();
  