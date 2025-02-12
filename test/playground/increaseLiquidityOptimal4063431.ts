// ts-node test/playground/increaseLiquidityOptimal4063431.ts
import { IncreaseOptions } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Percent } from '@uniswap/sdk-core';
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
  getIncreaseLiquidityOptimalSwapInfoV4,
  getIncreaseLiquidityOptimalV4Tx,
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
  const increaseOptions: IncreaseOptions = {
    tokenId,
    slippageTolerance: new Percent(5, 1000),
    deadline: Math.floor(Date.now() / 1000 + 60 * 30),
  };
  const swapInfos = await getIncreaseLiquidityOptimalSwapInfoV4(
    increaseOptions,
    chainId,
    amm,
    /* token0Amount= */ CurrencyAmount.fromRawAmount(
      positionDetails.token0,
      '100000000000000',
    ),
    /* token1Amount= */ CurrencyAmount.fromRawAmount(
      positionDetails.token1,
      '0',
    ),
    from,
    /* tokenPricesUsd= */ ['3100', '1'],
    client,
    DEFAULT_SOLVERS,
    positionDetails.position,
  );
  for (const swapInfo of swapInfos) {
    const {
      solver,
      swapData,
      amount0,
      amount1,
      token0FeeAmount,
      token1FeeAmount,
      liquidity,
    } = swapInfo;
    const txRequest = await getIncreaseLiquidityOptimalV4Tx(
      increaseOptions,
      chainId,
      amm,
      /* token0Amount= */ CurrencyAmount.fromRawAmount(
        positionDetails.token0,
        amount0.toString(),
      ),
      /* token1Amount= */ CurrencyAmount.fromRawAmount(
        positionDetails.token1,
        amount1.toString(),
      ),
      from,
      client,
      swapData,
      liquidity,
      positionDetails.position,
      /* token0FeeAmount= */ token0FeeAmount,
      /* token1FeeAmount= */ token1FeeAmount,
    );
    console.log(
      `solver=${solver}, liquidity: ${swapInfo.liquidity}, txRequest=${JSON.stringify(txRequest)}`,
    );
  }
  process.exit(0);
}

main();
