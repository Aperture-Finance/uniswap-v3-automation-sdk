// ts-node test/playground/solvers.ts
import { ApertureSupportedChainId } from '../../src';
import { get1InchQuote } from '../../src/viem/solver/get1InchSolver';
import { buildRequest as build1InchRequest } from '../../src/viem/solver/get1InchSolver';
import { buildRequest, getOkxQuote } from '../../src/viem/solver/getOkxSolver';

const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
const userAddress = '0x8EB8a3b98659Cce290402893d0123abb75E3ab28';
const token0 = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH, native
const token1 = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC on chain1
const amount = '9000000000000000000'; // '9000000000000000';
const slippage = 0.03;

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

test1InchSolver();

async function testOkxSolver() {
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
    const { toAmount, tx, protocols } = await getOkxQuote(
      chainId,
      token0,
      token1,
      amount,
      userAddress,
      slippage,
    );
    console.log(
      `OKX toAmount=${toAmount}, tx=${JSON.stringify(tx)}, protocols=${protocols}`,
    );
  } catch (e) {
    console.error(e);
  }

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

testOkxSolver();
