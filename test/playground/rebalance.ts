// ts-node test/playground/rebalance.ts
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
  getRebalanceSwapInfo,
  getRebalanceSwapInfoV4,
} from '../../src/viem';

async function main() {
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);
  const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
  const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
  const client = getPublicClient(chainId);
  const from = '0x1fFd5d818187917E0043522C3bE583A393c2BbF7';
  const tokenId = 4063431;
  const tickLower = -196410;
  const tickUpper = -194400;
  const positionDetails = await PositionDetails.fromPositionId(
    chainId,
    amm,
    BigInt(tokenId),
    client,
  );
  // token0 = weth = 0x82af49447d8a07e3bd95bd0d56f35241523fbab1
  // token1 = usdc = 0xaf88d065e77c8cc2239327c5edb3a432268e5831
  const swapInfos = await getRebalanceSwapInfo(
    chainId,
    amm,
    from,
    BigInt(tokenId),
    tickLower,
    tickUpper,
    /* slippageTolerance= */ 0.005,
    /* tokenPricesUsd= */ ['3225', '1'],
    client,
    DEFAULT_SOLVERS,
    positionDetails,
  );
  console.log(swapInfos);
  console.log('done with rebalance v1 data');

  const swapInfosV4 = await getRebalanceSwapInfoV4(
    chainId,
    amm,
    client,
    from,
    positionDetails,
    tickLower,
    tickUpper,
    /* slippageTolerance= */ 0.005,
    /* tokenPricesUsd= */ ['3225', '1'],
    DEFAULT_SOLVERS,
  );
  console.log(swapInfosV4);
  console.log('done with rebalanceV4 data');
  process.exit(0);
}

main();
