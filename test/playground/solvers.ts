// ts-node test/playground/solvers.ts
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';

import { ApertureSupportedChainId } from '../../src';
import { get1InchQuote } from '../../src/viem/solver/get1InchSolver';
import { buildRequest as build1InchRequest } from '../../src/viem/solver/get1InchSolver';
import {
  buildRequest,
  getOkxQuote,
  getOkxSwap,
} from '../../src/viem/solver/getOkxSolver';
import { getSamePoolToAmount } from '../../src/viem/solver/getSamePoolSolver';

const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
const userAddress = '0x8EB8a3b98659Cce290402893d0123abb75E3ab28';
const token0 = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH, native
const token1 = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC on chain1
const feeOrTickSpacing = 3000;
const amount = '9000000000000000000'; // '9000000000000000';
const slippage = 0.03;

async function testSamePoolSolver() {
  const toAmount = await getSamePoolToAmount(
    amm,
    chainId,
    token0,
    token1,
    feeOrTickSpacing,
    /* amount= */ BigInt(amount),
  );
  console.log(`SamePoolSolver toAmount=${toAmount}`);
}

async function testSamePoolSolverPancakeSwap() {
  const toAmount = await getSamePoolToAmount(
    AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3,
    chainId,
    token0,
    token1,
    /* feeOrTickSpacing= */ 500,
    /* amount= */ BigInt(amount),
  );
  console.log(`SamePoolSolverPancakeSwap toAmount=${toAmount}`);
}

async function testSamePoolSolverPancakeSwapDifferentFee() {
  const toAmount = await getSamePoolToAmount(
    AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3,
    chainId,
    '0x152649eA73beAb28c5b49B26eb48f7EAD6d4c898', // CAKE
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    /* feeOrTickSpacing= */ 2500,
    /* amount= */ BigInt(amount),
  );
  console.log(`SamePoolSolverPancakeSwapDifferentFee toAmount=${toAmount}`);
}

async function testSamePoolSolverSlipStream() {
  const toAmount = await getSamePoolToAmount(
    AutomatedMarketMakerEnum.enum.SLIPSTREAM,
    ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID,
    /* token0=WETH */ '0x4200000000000000000000000000000000000006',
    /* token0=USDC */ '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    /* feeOrTickSpacing= */ 100,
    /* amount= */ BigInt(amount),
  );
  console.log(`SamePoolSolverSlipStream toAmount=${toAmount}`);
}

async function testSamePoolSolverSlipStreamDifferentTickSpacing() {
  const toAmount = await getSamePoolToAmount(
    AutomatedMarketMakerEnum.enum.SLIPSTREAM,
    ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID,
    /* token0=WETH */ '0x4200000000000000000000000000000000000006',
    /* token0=USDC */ '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    /* feeOrTickSpacing= */ 2000,
    /* amount= */ BigInt(amount),
  );
  console.log(
    `SamePoolSolverSlipStreamDifferentTickSpacing toAmount=${toAmount}`,
  );
}

async function test1InchSolver() {
  const swapParams = {
    chainId: chainId.toString(),
    src: token0,
    dst: token1,
    amount,
    from: userAddress,
    slippage: slippage.toString(),
    disableEstimate: 'true',
    allowPartialFill: 'false',
    includeProtocols: 'true',
  };
  const response = await build1InchRequest(
    chainId,
    'swap',
    new URLSearchParams(swapParams),
  );
  console.log('1Inch response.data', response.data);
  console.log(
    '1Inch response.data.protocols',
    JSON.stringify(response.data.protocols),
  );
  const { toAmount, tx, protocols } = await get1InchQuote(
    chainId,
    token0,
    token1,
    amount,
    userAddress,
    slippage,
  );

  console.log(
    `1Inch toAmount=${toAmount}, tx=${JSON.stringify(tx)}, protocols=${protocols}`,
  );
}

async function testOkxApprove() {
  const approveTransaction = await buildRequest('approve-transaction', {
    chainId,
    tokenContractAddress: token0,
    approveAmount: amount,
  });
  console.log('approveTransaction', approveTransaction);
  console.log('approveTransaction.data', approveTransaction.data);
  console.log(
    'approveTransaction.data.data[0]',
    approveTransaction.data.data[0],
  );
}

async function testOkxQuote() {
  try {
    const { toAmount } = await getOkxQuote(chainId, token0, token1, amount);
    console.log(`OKX quote toAmount=${toAmount}`);
  } catch (e) {
    console.error(e);
  }
}

async function testOkxSwap() {
  const date = new Date();
  console.log(`date=${date.toISOString()}`);
  const dateIsoString = '2024-09-05T21:04:39.977Z';
  const data =
    dateIsoString +
    'GET' +
    `/api/v5/dex/aggregator/swap?chainId=${chainId}&fromTokenAddress=${token0}&toTokenAddress=${token1}&amount=${amount}&slippage=${slippage}&userWalletAddress=${userAddress}`;
  console.log(`data=${data}`);
  try {
    const swapParams = {
      chainId: chainId.toString(),
      fromTokenAddress: token0,
      toTokenAddress: token1,
      amount,
      slippage: slippage.toString(),
      userWalletAddress: userAddress,
    };
    const response = await buildRequest(
      'swap',
      new URLSearchParams(swapParams),
    );
    console.log('OKX response.data ', response.data);
    console.log(
      'OKX response.data.data[0].routerResult.dexRouterList ',
      JSON.stringify(response.data.data[0].routerResult.dexRouterList),
    );
    const { toAmount, tx, protocols } = await getOkxSwap(
      chainId,
      token0,
      token1,
      amount,
      userAddress,
      slippage,
    );
    console.log(
      `OKX swap toAmount=${toAmount}, tx=${JSON.stringify(tx)}, protocols=${protocols}`,
    );
  } catch (e) {
    console.error(e);
  }
}

async function main() {
  await testSamePoolSolver();
  await testSamePoolSolverPancakeSwap();
  await testSamePoolSolverPancakeSwapDifferentFee();
  await testSamePoolSolverSlipStream();
  await testSamePoolSolverSlipStreamDifferentTickSpacing();
  // Skip since no longer subscribing to 1Inch API.
  if (false) await test1InchSolver();
  await testOkxApprove();
  await testOkxQuote();
  await testOkxSwap();
  process.exit(0);
}

main();
