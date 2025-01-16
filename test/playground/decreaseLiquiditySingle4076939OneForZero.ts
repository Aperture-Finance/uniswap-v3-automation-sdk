// ts-node test/playground/decreaseLiquiditySingle4076939OneForZero.ts
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
  getDecreaseLiquiditySingleSwapInfoV3,
  getDecreaseLiquiditySingleV3Tx,
  getPublicClient,
} from '../../src/viem';

async function main() {
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);
  const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
  const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
  const client = getPublicClient(chainId);
  const from = '0x1fFd5d818187917E0043522C3bE583A393c2BbF7';
  const tokenId = 4076939;
  const zeroForOne = false;
  const positionDetails = await PositionDetails.fromPositionId(
    chainId,
    amm,
    BigInt(tokenId),
    client,
  );
  // token0 = airdrop = https://arbiscan.io/address/0xdc5F1BF636DcAdaE7e285A484Dc71A1F5adeE0A1
  // token1 = usdt = https://arbiscan.io/address/0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9
  const decreaseLiquidityOptions: Omit<RemoveLiquidityOptions, 'collectOptions'> = {
    tokenId,
    liquidityPercentage: new Percent(100, 100), // position is $3.33 100%WETH. token0=weth, token1=usdc.. should take out $0.33 eth=.33/3116*1e18 token0amount = 1.06e14, $0.07 usdc
    slippageTolerance: new Percent(1000, 1000),
    deadline: Math.floor(Date.now() / 1000 + 60 * 30),
  };
  const swapInfos = await getDecreaseLiquiditySingleSwapInfoV3(
    decreaseLiquidityOptions,
    chainId,
    amm,
    zeroForOne,
    from,
    /* tokenPricesUsd= */ ['0.001', '1'],
    client,
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
    const txRequest = await getDecreaseLiquiditySingleV3Tx(
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
