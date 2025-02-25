import { ApertureSupportedChainId } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex } from 'viem';

type SelectedProtocol = {
  name: string;
  part: number;
  fromTokenAddress: string;
  toTokenAddress: string;
};

export type SwapRoute = Array<Array<Array<SelectedProtocol>>>;

export interface SolvedSwapInfo {
  toAmount: bigint;
  swapData: Hex;
  swapRoute?: SwapRoute;
}

export interface SolveMintOptimalProps {
  chainId: ApertureSupportedChainId;
  amm: AutomatedMarketMakerEnum;
  from: Address;
  token0: Address;
  token1: Address;
  feeOrTickSpacing: number;
  tickLower: number;
  tickUpper: number;
  slippage: number; // 0.01 = 1%
  poolAmountIn: bigint;
  zeroForOne: boolean;
  // optional and assume true by default as implemented in automanV1,
  // but set to false in automanV4+ (optimalSwapRouter is merged into automanV4).
  isUseOptimalSwapRouter?: boolean;
}

export interface ISolver {
  mintOptimal(props: SolveMintOptimalProps): Promise<SolvedSwapInfo>;
}

export enum E_Solver {
  SamePool = 'SamePool',
  PH = 'PropellerHeads',
  OKX = 'OKX',
  OneInch = '1Inch',
}

export const DEFAULT_SOLVERS = [
  E_Solver.SamePool,
  // E_Solver.PH, // PH is deprecating their API.
  E_Solver.OKX,
  // E_Solver.OneInch, // No longer paying for enterprise plan.
]; // order matters because first one will be select if the liquidities are the same.

export type SwapPath = {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  amountOut: string;
  minAmountOut: string;
};

export type SolverResult = {
  // Need 3 solvers/swapData/swapPaths for rebalance while collecting fees to wallet as tokenOut.
  // solver for swapping between token0 and token1 to the correct ratio for rebalancing to new position,
  // solver0 for swapping token0Owed to tokenOut, and solver1 for swapping token1Owed to tokenOut.
  solver: E_Solver;
  solver0?: E_Solver;
  solver1?: E_Solver;
  amount0: bigint;
  amount1: bigint;
  liquidity: bigint;
  swapData: Hex;
  swapData0?: Hex;
  swapData1?: Hex;
  swapRoute?: SwapRoute;
  swapRoute0?: SwapRoute;
  swapRoute1?: SwapRoute;
  swapPath?: SwapPath;
  swapPath0?: SwapPath;
  swapPath1?: SwapPath;
  priceImpact?: Big;
  priceImpact1?: Big;
  token0FeeAmount?: bigint;
  token1FeeAmount?: bigint;
  feeBips?: bigint;
  feeUSD?: string;
  gasFeeEstimation?: bigint;
  gasUnits?: bigint; // For backend to populate tx.gasLimit.
};
