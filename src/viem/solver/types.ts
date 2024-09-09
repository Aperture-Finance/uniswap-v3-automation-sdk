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
  swapData: Hex;
  swapRoute?: SwapRoute;
}

export interface SolveOptimalMintProps {
  chainId: ApertureSupportedChainId;
  amm: AutomatedMarketMakerEnum;
  fromAddress: Address;
  token0: Address;
  token1: Address;
  feeOrTickSpacing: number;
  tickLower: number;
  tickUpper: number;
  slippage: number; // 0.01 = 1%
  poolAmountIn: bigint;
  zeroForOne: boolean;
}

export interface ISolver {
  optimalMint(props: SolveOptimalMintProps): Promise<SolvedSwapInfo>;
}

export enum E_Solver {
  SamePool = 'SamePool',
  PH = 'PropellerHeads',
  OKX = 'OKX',
  OneInch = '1Inch',
}

export const ALL_SOLVERS = [
  E_Solver.SamePool,
  E_Solver.PH,
  E_Solver.OKX,
  E_Solver.OneInch,
]; // order matters

export type SwapPath = {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  amountOut: string;
  minAmountOut: string;
};

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
  gasFeeEstimation?: bigint;
};
