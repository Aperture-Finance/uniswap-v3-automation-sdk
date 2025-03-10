// ts-node test/playground/rebalance.ts
import { Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';

import {
  ApertureSupportedChainId,
  ConsoleLogger,
  IOCKEY_LOGGER,
  NULL_ADDRESS,
  ioc,
} from '../../src';
import {
  DEFAULT_SOLVERS,
  PositionDetails,
  getPublicClient,
  getRebalanceSwapInfo,
  getRebalanceSwapInfoBackend,
  getRebalanceSwapInfoV4,
  getRebalanceTx,
  getRebalanceV4Tx,
} from '../../src/viem';

const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
const client = getPublicClient(chainId);
const from = '0x1fFd5d818187917E0043522C3bE583A393c2BbF7';
const tokenId = 4228806;
const tickLower = -200220;
const tickUpper = -198180;
const slippage = 0.005; // 0.5%
const tokenPricesUsd: [string, string] = ['2200', '1'];
const nativeToUsd = '2200';
const includeSolvers = DEFAULT_SOLVERS;
const deadline = BigInt(Math.floor(Date.now() / 1000 + 60 * 30));
let positionDetails: PositionDetails;
const isCollect = true;
const tokenOut = NULL_ADDRESS; // '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'; // USDT
const isUnwrapNative = false;
// token0 = weth = 0x82af49447d8a07e3bd95bd0d56f35241523fbab1
// token1 = usdc = 0xaf88d065e77c8cc2239327c5edb3a432268e5831

async function rebalanceV2() {
  const swapInfos = await getRebalanceSwapInfo(
    chainId,
    amm,
    from,
    BigInt(tokenId),
    tickLower,
    tickUpper,
    slippage,
    tokenPricesUsd,
    client,
    includeSolvers,
    positionDetails,
  );
  console.log(swapInfos);
  for (const swapInfo of swapInfos) {
    const { liquidity, swapData, feeBips } = swapInfo;
    const txRequest = await getRebalanceTx(
      chainId,
      amm,
      /* ownerAddress= */ positionDetails.owner,
      /* existingPositionId= */ BigInt(tokenId),
      /* newPositionTickLower= */ tickLower,
      /* newPositionTickUpper= */ tickUpper,
      /* slippageTolerance= */ new Percent(Math.floor(slippage * 1e6), 1e6),
      /* deadlineEpochSeconds= */ deadline,
      client,
      swapData,
      liquidity,
      feeBips,
    );
    console.log(txRequest);
  }
}

// Tested: https://dashboard.tenderly.co/xorcutor/project/simulator/3c25b6e0-a4f7-4d0d-a6e1-850abdf7fa2b
async function rebalanceBackend() {
  const swapInfos = await getRebalanceSwapInfoBackend(
    chainId,
    amm,
    client,
    from,
    positionDetails,
    tickLower,
    tickUpper,
    slippage,
    tokenPricesUsd,
    nativeToUsd,
    includeSolvers,
  );
  console.log(swapInfos);
  for (const swapInfo of swapInfos) {
    const { liquidity, swapData, feeBips } = swapInfo;
    const txRequest = await getRebalanceTx(
      chainId,
      amm,
      /* ownerAddress= */ positionDetails.owner,
      /* existingPositionId= */ BigInt(tokenId),
      /* newPositionTickLower= */ tickLower,
      /* newPositionTickUpper= */ tickUpper,
      /* slippageTolerance= */ new Percent(Math.floor(slippage * 1e6), 1e6),
      /* deadlineEpochSeconds= */ deadline,
      client,
      swapData,
      liquidity,
      feeBips,
    );
    console.log(txRequest);
  }
}

// Tested without collecting: https://dashboard.tenderly.co/xorcutor/project/simulator/8cd774c4-3c01-4811-bab1-45bf5eed7c1b
// Tested collect to NULL_ADDRESS && isUnwrapNative: https://dashboard.tenderly.co/xorcutor/project/simulator/c808e906-594c-4b8c-a7fa-afc70f89fb6f
// Tested collect to NULL_ADDRESS && !isUnwrapNative: https://dashboard.tenderly.co/xorcutor/project/simulator/8c65f929-62b3-4b13-bb7c-70ad61f41ebd
// Tested collect to token2: https://dashboard.tenderly.co/xorcutor/project/simulator/3a50f725-7551-4683-9424-52244d66dc0a
async function rebalanceV4() {
  const swapInfos = await getRebalanceSwapInfoV4(
    amm,
    chainId,
    client,
    from,
    positionDetails,
    tickLower,
    tickUpper,
    slippage,
    isCollect,
    tokenOut,
    isUnwrapNative,
    tokenPricesUsd,
    includeSolvers,
  );
  console.log(swapInfos);
  for (const swapInfo of swapInfos) {
    const { liquidity, swapData, token0FeeAmount, token1FeeAmount, amountOut } =
      swapInfo;
    const txRequest = await getRebalanceV4Tx(
      amm,
      chainId,
      /* owner= */ from,
      /* existingPositionId= */ BigInt(tokenId),
      positionDetails.position,
      liquidity,
      /* newPositionTickLower= */ tickLower,
      /* newPositionTickUpper= */ tickUpper,
      /* slippageTolerance= */ slippage,
      /* deadlineEpochSeconds= */ deadline,
      swapData,
      isCollect,
      token0FeeAmount ?? 0n,
      token1FeeAmount ?? 0n,
      tokenOut,
      /* amountOutExpected= */ amountOut ?? 0n,
      /* swapData0= */ '0x',
      /* swapData1= */ '0x',
      isUnwrapNative,
    );
    console.log(txRequest);
  }
}

async function main() {
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);
  positionDetails = await PositionDetails.fromPositionId(
    chainId,
    amm,
    BigInt(tokenId),
    client,
  );
  await rebalanceV2();
  await rebalanceBackend();
  await rebalanceV4();
  process.exit(0);
}

main();
