import { Address } from 'viem';

import { E_Solver, SwapRoute } from '../solver';

export enum E_Solver {
  PH = 'PropellerHeads',
  UNISWAP = 'Uniswap',
  OneInch = '1Inch',
}

export type SolverResult = {
  solver?: E_Solver; // TODO: make it required
  amount0: bigint;
  amount1: bigint;
  liquidity: bigint;
  swapData: Address;
  swapRoute?: SwapRoute;
  swapPath?: SwapPath;
  priceImpact?: Big;
};

export type SwapPath = {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  amountOut: string;
  minAmountOut: string;
};
