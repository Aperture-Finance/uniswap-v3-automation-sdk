// ts-node test/playground/decreaseLiquidityV4.ts
// tested isUnwrapNative: https://dashboard.tenderly.co/xorcutor/project/simulator/f9c04b72-9030-43c2-8b4e-9c9271511080
// tested !isUnwrapNative: https://dashboard.tenderly.co/xorcutor/project/simulator/f25d0336-f779-45bc-bc3a-9a7a3fb91f36
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
  getDecreaseLiquidityV4SwapInfo,
  getDecreaseLiquidityV4Tx,
  getPublicClient,
} from '../../src/viem';

async function main() {
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);
  const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
  const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
  const client = getPublicClient(chainId);
  const from = '0x1fFd5d818187917E0043522C3bE583A393c2BbF7';
  const tokenId = 4105824;
  const tokenOut = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
  const isUnwrapNative = true;
  const positionDetails = await PositionDetails.fromPositionId(
    chainId,
    amm,
    BigInt(tokenId),
    client,
  );
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
  const swapInfo = await getDecreaseLiquidityV4SwapInfo(
    amm,
    chainId,
    client,
    from,
    positionDetails,
    decreaseLiquidityOptions,
    tokenOut,
    isUnwrapNative,
    /* tokenPricesUsd= */ ['1', '1'],
    DEFAULT_SOLVERS,
  );
  const {
    solver,
    solver1,
    swapData,
    swapData1,
    amount0,
    amount1,
    token0FeeAmount,
    token1FeeAmount,
  } = swapInfo;
  const txRequest = await getDecreaseLiquidityV4Tx(
    amm,
    chainId,
    from,
    positionDetails,
    decreaseLiquidityOptions,
    tokenOut,
    token0FeeAmount,
    token1FeeAmount,
    /* swapData1= */ swapData,
    swapData1,
    isUnwrapNative,
  );
  console.log(
    `solver=${solver}, solver1=${solver1}, liquidity: ${swapInfo.liquidity}, amount0=${amount0}, amount1=${amount1}, to=${txRequest.to}, from=${txRequest.from}, data=${txRequest.data}`,
  );
  process.exit(0);
}

main();
