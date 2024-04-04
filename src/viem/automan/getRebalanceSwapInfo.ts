import { ApertureSupportedChainId } from '@/index';
import {
  MintParams,
  PositionDetails,
  calculateRebalancePriceImpact,
  optimalRebalance,
} from '@/viem';
import { Position } from '@aperture_finance/uniswap-v3-sdk';
import { Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient, zeroAddress } from 'viem';

import { getSwapPath } from './internal';

/**
 * calculates the optimal swap information including swap path info, swap route and price impact for rebalances an existing position into a new one with the specified price range using Aperture's Automan contract.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param ownerAddress Owner of the existing position.
 * @param existingPositionId Existing position token id.
 * @param newPositionTickLower The lower tick of the new position.
 * @param newPositionTickUpper The upper tick of the new position.
 * @param slippageTolerance How much the amount of either token0 or token1 in the new position is allowed to change unfavorably.
 * @param deadlineEpochSeconds Timestamp when the tx expires (in seconds since epoch).
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
  deadlineEpochSeconds: bigint,
  publicClient: PublicClient,
  position?: Position,
  use1inch?: boolean,
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
    amount0: expectedAmount0,
    amount1: expectedAmount1,
    receive0,
    receive1,
    liquidity,
    swapData,
    swapRoute,
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
  );

  const newPos = new Position({
    pool: position.pool,
    liquidity: liquidity.toString(),
    tickLower: newPositionTickLower,
    tickUpper: newPositionTickUpper,
  });

  const { amount0, amount1 } = newPos.mintAmountsWithSlippage(
    new Percent(Math.floor(slippageTolerance * 1e6), 1e6),
  );

  const mintParams: MintParams = {
    token0: position.pool.token0.address as Address,
    token1: position.pool.token1.address as Address,
    fee: position.pool.fee,
    tickLower: newPositionTickLower,
    tickUpper: newPositionTickUpper,
    amount0Desired: 0n, // Param value ignored by Automan.
    amount1Desired: 0n, // Param value ignored by Automan.
    amount0Min: BigInt(amount0.toString()),
    amount1Min: BigInt(amount1.toString()),
    recipient: zeroAddress, // Param value ignored by Automan.
    deadline: deadlineEpochSeconds,
  };

  const priceImpact = await calculateRebalancePriceImpact({
    chainId,
    amm,
    swapData: swapData as `0x${string}`,
    from: ownerAddress,
    owner: ownerAddress,
    tokenId: existingPositionId,
    mintParams,
    publicClient,
  });

  return {
    swapRoute,
    swapPath: getSwapPath(
      position.pool.token0.address as Address,
      position.pool.token1.address as Address,
      receive0,
      receive1,
      expectedAmount0,
      expectedAmount1,
      slippageTolerance,
    ),
    priceImpact,
  };
}
