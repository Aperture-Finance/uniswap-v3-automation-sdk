import { Address } from 'viem';

type SelectedProtocol = {
  name: string;
  part: number;
  fromTokenAddress: string;
  toTokenAddress: string;
};
export type SwapRoute = Array<Array<Array<SelectedProtocol>>>;

export type SolverResult = {
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
