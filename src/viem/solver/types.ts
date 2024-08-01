import { ApertureSupportedChainId } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex } from 'viem';

import { SlipStreamMintParams, UniV3MintParams } from '../automan';

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
  OneInch = '1Inch',
}

export const ALL_SOLVERS = [E_Solver.SamePool, E_Solver.OneInch, E_Solver.PH]; // order matters
