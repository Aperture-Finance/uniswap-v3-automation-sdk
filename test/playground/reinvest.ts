// ts-node test/playground/reinvest.ts
import { IncreaseOptions } from '@aperture_finance/uniswap-v3-sdk';
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
  getPublicClient,
  getReinvestSwapInfoBackend,
  getReinvestTx,
} from '../../src/viem';

async function main() {
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);
  const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
  const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
  const from = '0x1fFd5d818187917E0043522C3bE583A393c2BbF7';
  const tokenId = 4076939;
  const client = getPublicClient(chainId);
  const positionDetails = await PositionDetails.fromPositionId(
    chainId,
    amm,
    BigInt(tokenId),
    client,
  );
  const increaseOptions: IncreaseOptions = {
    tokenId,
    slippageTolerance: new Percent(5, 1000),
    deadline: Math.floor(Date.now() / 1000 + 60 * 30),
  };
  const swapInfos = await getReinvestSwapInfoBackend(
    chainId,
    amm,
    client,
    from,
    increaseOptions,
    /* tokenPricesUsd= */ ['0.001', '1'], // AIRDROP/USDT
    /* nativeToUsd= */ '3000',
    DEFAULT_SOLVERS,
    positionDetails,
  );
  for (const swapInfo of swapInfos) {
    const { solver, swapData, amount0, amount1, feeBips, liquidity } = swapInfo;
    const txRequest = await getReinvestTx(
      chainId,
      amm,
      from,
      increaseOptions,
      feeBips!,
      swapData,
      /* amount0Min= */ amount0,
      /* amount1Min= */ amount1,
    );
    console.log(
      `solver=${solver}, liquidity: ${liquidity}, txRequest=${JSON.stringify(txRequest)}`,
    );
  }
}

main();
