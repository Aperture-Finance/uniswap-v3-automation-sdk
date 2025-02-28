import { ApertureSupportedChainId } from '@/index';
import {
  E_Solver,
  PositionDetails,
  SolverResult,
  rebalanceBackend,
  rebalanceOptimalV2,
  rebalanceV3,
} from '@/viem';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

/**
 * calculates the optimal swap information including swap path info, swap route and price impact for rebalances an existing position into a new one with the specified price range using Aperture's Automan contract.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param from The address to rebalance from.
 * @param existingPositionId Existing position token id.
 * @param newPositionTickLower The lower tick of the new position.
 * @param newPositionTickUpper The upper tick of the new position.
 * @param slippageTolerance How much the amount of either token0 or token1 in the new position is allowed to change unfavorably.
 * @param tokenPrices The prices of the two tokens in the pool.
 * @param publicClient Viem public client.
 * @param includeSolvers Optional. The solvers to include in the quote. If not provided, all solvers will be included.
 * @param positionDetails Optional, the existing positionDetails.
 * @param blockNumber Optional. The block number to simulate the call from.
 */
export async function getRebalanceSwapInfo(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  from: Address,
  existingPositionId: bigint,
  newPositionTickLower: number,
  newPositionTickUpper: number,
  slippageTolerance: number,
  tokenPricesUsd: [string, string],
  publicClient: PublicClient,
  includeSolvers?: E_Solver[],
  positionDetails?: PositionDetails,
  blockNumber?: bigint,
  feesOn?: boolean,
): Promise<SolverResult[]> {
  if (positionDetails === undefined) {
    positionDetails = await PositionDetails.fromPositionId(
      chainId,
      amm,
      existingPositionId,
      publicClient,
      blockNumber,
    );
  }

  return rebalanceOptimalV2(
    chainId,
    amm,
    positionDetails,
    newPositionTickLower,
    newPositionTickUpper,
    from,
    slippageTolerance,
    tokenPricesUsd,
    publicClient,
    blockNumber,
    includeSolvers,
    feesOn,
  );
}

/**
 * Calculates the SolverResults for rebalances from an existing position into a new one with the specified price range using Aperture's Automan contract.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param from The address to rebalance from.
 * @param existingPositionId Existing position token id.
 * @param newPositionTickLower The lower tick of the new position.
 * @param newPositionTickUpper The upper tick of the new position.
 * @param slippageTolerance How much the amount of either token0 or token1 in the new position is allowed to change unfavorably.
 * @param tokenPrices The prices of the two tokens in the pool.
 * @param publicClient Viem public client.
 * @param includeSolvers Optional. The solvers to include in the quote. If not provided, all solvers will be included.
 * @param positionDetails Optional, the existing positionDetails.
 * @param blockNumber Optional. The block number to simulate the call from.
 */
export async function getRebalanceSwapInfoBackend(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  positionDetails: PositionDetails,
  newPositionTickLower: number,
  newPositionTickUpper: number,
  slippage: number,
  tokenPricesUsd: [string, string],
  nativeToUsd: string,
  includeSolvers?: E_Solver[],
  blockNumber?: bigint,
): Promise<SolverResult[]> {
  return rebalanceBackend(
    chainId,
    amm,
    publicClient,
    from,
    positionDetails,
    newPositionTickLower,
    newPositionTickUpper,
    slippage,
    tokenPricesUsd,
    nativeToUsd,
    includeSolvers,
    blockNumber,
  );
}

// Same as getRebalanceSwapInfo, except return the fees as token0FeeAmount and token1FeeAmount instead of feeBips
// Do not use, but implemented to make it easier to migrate to future versions.
export async function getRebalanceSwapInfoV3(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  positionDetails: PositionDetails,
  newPositionTickLower: number,
  newPositionTickUpper: number,
  slippage: number,
  tokenPricesUsd: [string, string],
  includeSolvers?: E_Solver[],
  blockNumber?: bigint,
): Promise<SolverResult[]> {
  return rebalanceV3(
    chainId,
    amm,
    publicClient,
    from,
    positionDetails,
    newPositionTickLower,
    newPositionTickUpper,
    slippage,
    tokenPricesUsd,
    includeSolvers,
    blockNumber,
  );
}
