// ts-node test/playground/increaseLiquidityFromTokenIn.ts
// tested: https://dashboard.tenderly.co/xorcutor/project/simulator/0cce6839-021b-4fbe-a612-65932630c63c
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
  getIncreaseLiquidityFromTokenInSwapInfo,
  getIncreaseLiquidityFromTokenInTx,
  getPosition,
  getPublicClient,
  getToken,
} from '../../src/viem';

async function main() {
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);
  const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
  const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
  const publicClient = getPublicClient(chainId);
  const from = '0x1fFd5d818187917E0043522C3bE583A393c2BbF7';
  const tokenId = 4228806;
  const tokenInAddress = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f'; // wbtc
  const tokenInAmount = 4181n; // about $4 worth of wbtc
  const increaseOptions: IncreaseOptions = {
    tokenId,
    slippageTolerance: new Percent(5, 1000),
    deadline: Math.floor(Date.now() / 1000 + 60 * 30),
  };
  const [tokenIn, position] = await Promise.all([
    getToken(tokenInAddress, chainId, publicClient),
    getPosition(chainId, amm, BigInt(tokenId), publicClient),
  ]);
  const swapInfo = await getIncreaseLiquidityFromTokenInSwapInfo(
    amm,
    chainId,
    publicClient,
    from,
    increaseOptions,
    position,
    tokenIn,
    tokenInAmount,
    /* tokenInPriceUsd= */ '95000',
  );
  const {
    solver0,
    solver1,
    swapData0,
    swapData1,
    amount0,
    amount1,
    token0FeeAmount,
    token1FeeAmount,
    liquidity,
  } = swapInfo;
  const txRequest = (
    await getIncreaseLiquidityFromTokenInTx(
      amm,
      chainId,
      from,
      increaseOptions,
      position,
      tokenIn,
      /* tokenInAmountToSwapToToken0= */ amount0,
      /* tokenInAmountToSwapToToken1= */ amount1,
      /* tokenInFeeAmount= */ (token0FeeAmount ?? 0n) + (token1FeeAmount ?? 0n),
      swapData0 ?? '0x',
      swapData1 ?? '0x',
      liquidity,
    )
  ).tx;
  console.log(
    `solver0=${solver0}, solver1=${solver1}, liquidity: ${swapInfo.liquidity}, amount0=${amount0}, amount0=${amount1}, tokenInFeeAmount=${(token0FeeAmount ?? 0n) + (token1FeeAmount ?? 0n)}, swapData0=${swapData0}, swapData1=${swapData1}, txRequest=${JSON.stringify(txRequest)}`,
  );
  process.exit(0);
}

main();
