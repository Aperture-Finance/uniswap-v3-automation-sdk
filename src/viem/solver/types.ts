import { ApertureSupportedChainId } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex, PublicClient } from 'viem';

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

export interface SolverProps {
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
  client?: PublicClient;
}

export interface ISolver {
  solve(props: SolverProps): Promise<SolvedSwapInfo>;
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
  // E_Solver.OKX, // OKX is suspending their API.
  E_Solver.OneInch,
]; // order matters because first one will be select if the liquidities are the same.

export type SwapPath = {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  amountOut: string;
  minAmountOut: string;
};

export type SolverResult = {
  solver: E_Solver;
  amount0: bigint;
  amount1: bigint;
  liquidity: bigint;
  swapData: Address;
  swapRoute?: SwapRoute;
  swapPath?: SwapPath;
  priceImpact?: Big;
  token0FeeAmount?: bigint;
  token1FeeAmount?: bigint;
  feeBips?: bigint;
  feeUSD?: string;
  gasFeeEstimation?: bigint;
  gasUnits?: bigint; // For backend to populate tx.gasLimit.
};
