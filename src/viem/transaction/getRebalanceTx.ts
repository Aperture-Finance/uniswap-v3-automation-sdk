import { ApertureSupportedChainId, PermitInfo, getChainInfo } from '@/index';
import {
  MintParams,
  PositionDetails,
  calculateRebalancePriceImpact,
  getAutomanRebalanceCalldata,
  optimalRebalance,
} from '@/viem';
import { Percent } from '@uniswap/sdk-core';
import { Position } from '@uniswap/v3-sdk';
import { Address, PublicClient, zeroAddress } from 'viem';

import { getSwapPath } from './internal';

/**
 * calculates the optimal swap information including swap path info, swap route and price impact for rebalances an existing position into a new one with the specified price range using Aperture's Automan contract.
 * @param chainId Chain id.
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
export async function getRebalanceTx(
  chainId: ApertureSupportedChainId,
  ownerAddress: Address,
  existingPositionId: bigint,
  newPositionTickLower: number,
  newPositionTickUpper: number,
  slippageTolerance: number,
  deadlineEpochSeconds: bigint,
  publicClient: PublicClient,
  position?: Position,
  permitInfo?: PermitInfo,
  use1inch?: boolean,
) {
  if (position === undefined) {
    ({ position } = await PositionDetails.fromPositionId(
      chainId,
      existingPositionId,
      publicClient,
    ));
  }

  const {
    amount0: expectedAmount0,
    amount1: expectedAmount1,
    liquidity,
    swapData,
  } = await optimalRebalance(
    chainId,
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

  const { amount0: amount0Min, amount1: amount1Min } =
    newPos.mintAmountsWithSlippage(
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
    amount0Min: BigInt(amount0Min.toString()),
    amount1Min: BigInt(amount1Min.toString()),
    recipient: zeroAddress, // Param value ignored by Automan.
    deadline: deadlineEpochSeconds,
  };

  const amounts = {
    amount0Min: amount0Min.toString(),
    amount1Min: amount1Min.toString(),
    amount0: expectedAmount0.toString(),
    amount1: expectedAmount1.toString(),
  };
  const { aperture_uniswap_v3_automan } = getChainInfo(chainId);

  const data = getAutomanRebalanceCalldata(
    mintParams,
    existingPositionId,
    0n,
    permitInfo,
    swapData,
  );

  return {
    tx: {
      from: ownerAddress,
      to: aperture_uniswap_v3_automan,
      data: data,
    },
    amounts,
  };
}
