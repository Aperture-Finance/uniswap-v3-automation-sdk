import { ApertureSupportedChainId } from '@/index';
import {
  E_Solver,
  PositionDetails,
  SolverResult,
  optimalRebalanceV2,
} from '@/viem';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

/**
 * calculates the optimal swap information including swap path info, swap route and price impact for rebalances an existing position into a new one with the specified price range using Aperture's Automan contract.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param ownerAddress Owner of the existing position.
 * @param existingPositionId Existing position token id.
 * @param newPositionTickLower The lower tick of the new position.
 * @param newPositionTickUpper The upper tick of the new position.
 * @param slippageTolerance How much the amount of either token0 or token1 in the new position is allowed to change unfavorably.
 * @param tokenPrices The prices of the two tokens in the pool.
 * @param publicClient Viem public client.
 * @param includeSolvers Optional. The solvers to include in the quote. If not provided, all solvers will be included.
 * @param position Optional, the existing position.
 * @param blockNumber Optional. The block number to simulate the call from.
 */
export async function getRebalanceSwapInfo(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  ownerAddress: Address,
  existingPositionId: bigint,
  newPositionTickLower: number,
  newPositionTickUpper: number,
  slippageTolerance: number,
  tokenPrices: [string, string],
  publicClient: PublicClient,
  includeSolvers?: E_Solver[],
  position?: PositionDetails,
  blockNumber?: bigint,
  feesOn?: boolean,
): Promise<SolverResult[]> {
  if (position === undefined) {
    position = await PositionDetails.fromPositionId(
      chainId,
      amm,
      existingPositionId,
      publicClient,
      blockNumber,
    );
  }

  return optimalRebalanceV2(
    chainId,
    amm,
    position,
    newPositionTickLower,
    newPositionTickUpper,
    ownerAddress,
    slippageTolerance,
    tokenPrices,
    publicClient,
    blockNumber,
    includeSolvers,
    feesOn,
  );
}
