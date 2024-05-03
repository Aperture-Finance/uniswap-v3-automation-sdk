import { ApertureSupportedChainId } from '@/index';
import { PositionDetails, optimalRebalance } from '@/viem';
import { Position } from '@aperture_finance/uniswap-v3-sdk';
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
 * @param position Optional, the existing position.
 * @param use1inch Optional. If set to true, the 1inch aggregator will be used to facilitate the swap.
 * @returns The generated transaction request and expected amounts.
 */
export async function getRebalanceSwapInfo(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  ownerAddress: Address,
  existingPositionId: bigint,
  newPositionTickLower: number,
  newPositionTickUpper: number,
  slippageTolerance: number,
  publicClient: PublicClient,
  position?: Position,
  use1inch?: boolean,
  blockNumber?: bigint,
) {
  if (position === undefined) {
    ({ position } = await PositionDetails.fromPositionId(
      chainId,
      amm,
      existingPositionId,
      publicClient,
    ));
  }

  const {
    amount0: finalAmount0,
    amount1: finalAmount1,
    swapRoute,
    priceImpact,
    swapPath,
  } = await optimalRebalance(
    chainId,
    amm,
    existingPositionId,
    newPositionTickLower,
    newPositionTickUpper,
    /**fee */ 0n,
    !use1inch,
    ownerAddress,
    slippageTolerance,
    publicClient,
    blockNumber,
  );

  return {
    swapRoute,
    swapPath: swapPath!,
    priceImpact: priceImpact!,
    finalAmount0,
    finalAmount1,
  };
}
