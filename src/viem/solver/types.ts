import { ApertureSupportedChainId } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex, PublicClient } from 'viem';

import { MintParams } from '../automan';

type SelectedProtocol = {
  name: string;
  part: number;
  fromTokenAddress: string;
  toTokenAddress: string;
};

export type SwapRoute = Array<Array<Array<SelectedProtocol>>>;

export interface SolvedSwapInfo {
  swapData?: Hex;
  swapRoute?: SwapRoute;
}

export interface RebalanceSolveProps {
  chainId: ApertureSupportedChainId;
  amm: AutomatedMarketMakerEnum;
  publicClient: PublicClient;
  fromAddress: Address;
  mintParams: MintParams;
  slippage: number;
  positionId: bigint;
  positionOwner: Address;
  feeBips: bigint;
  blockNumber?: bigint;
}

export interface ISolver {
  rebalance(props: RebalanceSolveProps): Promise<SolvedSwapInfo>;
}

export enum E_Solver {
  PH = 'PropellerHeads',
  UNISWAP = 'Uniswap',
  OneInch = '1Inch',
}
