import {
  ApertureSupportedChainId,
  Automan__factory,
  PermitInfo,
  getAMMInfo,
} from '@/index';
import { ADDRESS_ZERO, Pool, Position } from '@aperture_finance/uniswap-v3-sdk';
import { Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import {
  Address,
  Hex,
  PublicClient,
  TransactionRequest,
  decodeFunctionResult,
} from 'viem';

import {
  MintParams,
  RebalanceReturnType,
  getAutomanRebalanceCalldata,
} from '../automan';
import { PositionDetails } from '../position';
import { SimulatedAmounts } from './types';

// TODO: add unit test
/**
 * Generates an unsigned transaction that rebalances an existing position into a new one with the specified price range using Aperture's Automan contract.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param ownerAddress Owner of the existing position.
 * @param existingPositionId Existing position token id.
 * @param newPositionTickLower The lower tick of the new position.
 * @param newPositionTickUpper The upper tick of the new position.
 * @param slippageTolerance How much the amount of either token0 or token1 in the new position is allowed to change unfavorably.
 * @param deadlineEpochSeconds Timestamp when the tx expires (in seconds since epoch).
 * @param publicClient Viem public client.
 * @param swapData Swap data for the position.
 * @param position Optional, the existing position.
 * @param permitInfo Optional. If Automan doesn't already have authority over the existing position, this should be populated with valid owner-signed permit info.
 * @returns The generated transaction request and expected amounts.
 */
export async function getRebalanceTx(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  ownerAddress: Address,
  existingPositionId: bigint,
  newPositionTickLower: number,
  newPositionTickUpper: number,
  slippageTolerance: Percent,
  deadlineEpochSeconds: bigint,
  publicClient: PublicClient,
  swapData: Hex,
  position?: Position,
  permitInfo?: PermitInfo,
): Promise<{
  tx: TransactionRequest;
  amounts: SimulatedAmounts;
}> {
  if (position === undefined) {
    ({ position } = await PositionDetails.fromPositionId(
      chainId,
      amm,
      existingPositionId,
      publicClient,
    ));
  }

  const mintParams: MintParams = {
    token0: position.pool.token0.address as Address,
    token1: position.pool.token1.address as Address,
    fee: position.pool.fee,
    tickLower: newPositionTickLower,
    tickUpper: newPositionTickUpper,
    amount0Desired: 0n, // Param value ignored by Automan.
    amount1Desired: 0n, // Param value ignored by Automan.
    amount0Min: 0n, // Setting this to zero for tx simulation.
    amount1Min: 0n, // Setting this to zero for tx simulation.
    recipient: ADDRESS_ZERO, // Param value ignored by Automan.
    deadline: deadlineEpochSeconds,
  };
  const { apertureAutoman } = getAMMInfo(chainId, amm)!;
  const data = getAutomanRebalanceCalldata(
    mintParams,
    existingPositionId,
    0n,
    permitInfo,
    swapData,
  );
  const amounts = await getAmountsWithSlippage(
    position.pool,
    newPositionTickLower,
    newPositionTickUpper,
    apertureAutoman,
    ownerAddress,
    data,
    slippageTolerance,
    publicClient,
  );
  mintParams.amount0Min = amounts.amount0Min;
  mintParams.amount1Min = amounts.amount1Min;
  return {
    tx: {
      from: ownerAddress,
      to: apertureAutoman,
      data: getAutomanRebalanceCalldata(
        mintParams,
        existingPositionId,
        0n,
        permitInfo,
        swapData,
      ),
    },
    amounts,
  };
}

async function getAmountsWithSlippage(
  pool: Pool,
  tickLower: number,
  tickUpper: number,
  automanAddress: Address,
  ownerAddress: Address,
  callData: Hex,
  slippageTolerance: Percent,
  publicClient: PublicClient,
): Promise<SimulatedAmounts> {
  const { data } = await publicClient.call({
    account: ownerAddress,
    to: automanAddress,
    data: callData,
  });
  if (!data) throw new Error('No data returned from call');

  const [, liquidity, amount0, amount1]: RebalanceReturnType =
    decodeFunctionResult({
      abi: Automan__factory.abi,
      data,
      functionName: 'rebalance',
    });

  const { amount0: amount0Min, amount1: amount1Min } = new Position({
    pool,
    liquidity: liquidity.toString(),
    tickLower,
    tickUpper,
  }).mintAmountsWithSlippage(slippageTolerance);
  return {
    amount0,
    amount1,
    amount0Min: BigInt(amount0Min.toString()),
    amount1Min: BigInt(amount1Min.toString()),
  };
}
