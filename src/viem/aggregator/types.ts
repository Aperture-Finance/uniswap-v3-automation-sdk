import { Address } from 'viem';

import { E_Solver, SwapRoute } from '../solver';

export type SolverResult = {
  solver?: E_Solver; // TODO: make it required
  amount0: bigint;
  amount1: bigint;
  liquidity: bigint;
  swapData: Address;
  swapRoute?: SwapRoute;
  swapPath?: SwapPath;
  priceImpact?: Big;
  feeBips?: bigint;
  feeUSD?: string;
  gasInRawNativeCurrency?: bigint;
};

export type SwapPath = {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  amountOut: string;
  minAmountOut: string;
};
