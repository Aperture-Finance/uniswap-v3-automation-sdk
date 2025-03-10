// ts-node test/playground/priceImpact.ts
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address } from 'viem';

import { ApertureSupportedChainId } from '../../src';
import {
  DEFAULT_SOLVERS,
  PositionDetails,
  getPublicClient,
} from '../../src/viem';
import {
  calcPriceImpact,
  solveExactInput,
} from '../../src/viem/solver/internal';

const amm = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
const from = '0x1fFd5d818187917E0043522C3bE583A393c2BbF7';
const tokenId = 4228806;
const amountIn = 100000000000n;
const slippage = 0.005;

async function main() {
  const client = getPublicClient(chainId);
  const positionDetails = await PositionDetails.fromPositionId(
    chainId,
    amm,
    BigInt(tokenId),
    client,
  );
  // token0 = weth = 0x82af49447d8a07e3bd95bd0d56f35241523fbab1
  // token1 = usdc = 0xaf88d065e77c8cc2239327c5edb3a432268e5831
  const priceImpact = calcPriceImpact(
    positionDetails.pool,
    /* initAmount0= */ 0n,
    /* initAmount1= */ amountIn,
    /* finalAmount0= */ 454545454545454n,
    /* finalAmount1= */ 0n,
  );
  console.log(`priceImpact=${priceImpact}`);
  const solverResults = await solveExactInput(
    amm,
    chainId,
    from,
    /* tokenIn= */ positionDetails.token1.address as Address,
    /* tokenOut= */ positionDetails.token0.address as Address,
    /* feeOrTickSpacing= */ positionDetails.pool.fee,
    amountIn,
    slippage,
    DEFAULT_SOLVERS,
  );
  console.log(
    `solverResults=${JSON.stringify(solverResults, (_, v) => (typeof v === 'bigint' ? v.toString() : v))}`,
  );
  process.exit(0);
}

main();
