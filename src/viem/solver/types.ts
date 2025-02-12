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
  fromAddress: Address;
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
  solver: E_Solver;
  amount0: bigint;
  amount1: bigint;
  liquidity: bigint;
  swapData: Hex;
  swapData1?: Hex; // For zap to/from tokenC
  swapRoute?: SwapRoute;
  swapRoute1?: SwapRoute; // For zap to/from tokenC
  swapPath?: SwapPath;
  swapPath1?: SwapPath; // For zap to/from tokenC
  priceImpact?: Big;
  priceImpact1?: Big;
  token0FeeAmount?: bigint;
  token1FeeAmount?: bigint;
  feeBips?: bigint;
  feeUSD?: string;
  gasFeeEstimation?: bigint;
  gasUnits?: bigint; // For backend to populate tx.gasLimit.
};
