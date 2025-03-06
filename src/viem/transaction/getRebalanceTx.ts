import { ApertureSupportedChainId, PermitInfo, getAMMInfo } from '@/index';
import { ADDRESS_ZERO, Position } from '@aperture_finance/uniswap-v3-sdk';
import { Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient, TransactionRequest } from 'viem';

import {
  SlipStreamMintParams,
  UniV3MintParams,
  ZapOutParams,
  getAutomanRebalanceCalldata,
  getAutomanV4RebalanceCalldata,
} from '../automan';
import { PositionDetails } from '../position';
import { SimulatedAmounts } from './types';

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
 * @param swapData Swap data for the position, returned by getRebalanceSwapInfo.
 * @param liquidity The amount of liquidity for the rebalanced position.
 * @param feeBips The fee Aperture charges for the transaction.
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
  liquidity: bigint,
  feeBips: bigint = 0n,
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

  const newPosition = new Position({
    pool: position.pool,
    liquidity: liquidity.toString(),
    tickLower: newPositionTickLower,
    tickUpper: newPositionTickUpper,
  });
  const { amount0: amount0Min, amount1: amount1Min } =
    newPosition.mintAmountsWithSlippage(slippageTolerance);

  const mintParams: SlipStreamMintParams | UniV3MintParams =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? {
          token0: position.pool.token0.address as Address,
          token1: position.pool.token1.address as Address,
          tickSpacing: position.pool.tickSpacing,
          tickLower: newPositionTickLower,
          tickUpper: newPositionTickUpper,
          amount0Desired: 0n, // Param value ignored by Automan.
          amount1Desired: 0n, // Param value ignored by Automan.
          amount0Min: BigInt(amount0Min.toString()),
          amount1Min: BigInt(amount1Min.toString()),
          recipient: ADDRESS_ZERO, // Param value ignored by Automan.
          deadline: deadlineEpochSeconds,
          sqrtPriceX96: 0n,
        }
      : {
          token0: position.pool.token0.address as Address,
          token1: position.pool.token1.address as Address,
          fee: position.pool.fee,
          tickLower: newPositionTickLower,
          tickUpper: newPositionTickUpper,
          amount0Desired: 0n, // Param value ignored by Automan.
          amount1Desired: 0n, // Param value ignored by Automan.
          amount0Min: BigInt(amount0Min.toString()),
          amount1Min: BigInt(amount1Min.toString()),
          recipient: ADDRESS_ZERO, // Param value ignored by Automan.
          deadline: deadlineEpochSeconds,
        };

  return {
    tx: {
      from: ownerAddress,
      to: getAMMInfo(chainId, amm)!.apertureAutoman,
      data: getAutomanRebalanceCalldata(
        amm,
        mintParams,
        existingPositionId,
        feeBips,
        swapData,
        permitInfo,
      ),
    },
    amounts: {
      amount0Min: amount0Min.toString(),
      amount1Min: amount1Min.toString(),
    },
  };
}

// Same as getRebalanceTx, but with feeAmounts instead of feeBips.
// Do not use, but implemented to make it easier to migrate to future versions.
export async function getRebalanceV4Tx(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  owner: Address,
  existingPositionId: bigint,
  position: Position,
  liquidity: bigint,
  newPositionTickLower: number,
  newPositionTickUpper: number,
  slippage: number,
  deadlineEpochSeconds: bigint,
  swapData: Hex,
  isCollect: boolean,
  token0FeeAmount: bigint,
  token1FeeAmount: bigint,
  tokenOut: Address,
  tokenOutExpected: bigint,
  swapData0: Hex,
  swapData1: Hex,
  isUnwrapNative: boolean,
  permitInfo?: PermitInfo,
): Promise<{
  tx: TransactionRequest;
  amounts: SimulatedAmounts;
}> {
  const newPosition = new Position({
    pool: position.pool,
    liquidity: liquidity.toString(),
    tickLower: newPositionTickLower,
    tickUpper: newPositionTickUpper,
  });
  const { amount0: amount0Min, amount1: amount1Min } =
    newPosition.mintAmountsWithSlippage(
      new Percent(Math.floor(slippage * 1e6), 1e6),
    );
  const mintParams: SlipStreamMintParams | UniV3MintParams =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? {
          token0: position.pool.token0.address as Address,
          token1: position.pool.token1.address as Address,
          tickSpacing: position.pool.tickSpacing,
          tickLower: newPositionTickLower,
          tickUpper: newPositionTickUpper,
          amount0Desired: 0n, // Param value ignored by Automan.
          amount1Desired: 0n, // Param value ignored by Automan.
          amount0Min: BigInt(amount0Min.toString()),
          amount1Min: BigInt(amount1Min.toString()),
          recipient: ADDRESS_ZERO, // Param value ignored by Automan.
          deadline: deadlineEpochSeconds,
          sqrtPriceX96: 0n,
        }
      : {
          token0: position.pool.token0.address as Address,
          token1: position.pool.token1.address as Address,
          fee: position.pool.fee,
          tickLower: newPositionTickLower,
          tickUpper: newPositionTickUpper,
          amount0Desired: 0n, // Param value ignored by Automan.
          amount1Desired: 0n, // Param value ignored by Automan.
          amount0Min: BigInt(amount0Min.toString()),
          amount1Min: BigInt(amount1Min.toString()),
          recipient: ADDRESS_ZERO, // Param value ignored by Automan.
          deadline: deadlineEpochSeconds,
        };
  const tokenOutSlippage = BigInt(
    Big(tokenOutExpected.toString()).mul(slippage).toFixed(0),
  );
  const tokenOutMin = tokenOutExpected - tokenOutSlippage;
  const zapOutParams: ZapOutParams = {
    token0FeeAmount,
    token1FeeAmount,
    tokenOut,
    tokenOutMin,
    swapData0,
    swapData1,
    isUnwrapNative,
  };

  return {
    tx: {
      from: owner,
      to: getAMMInfo(chainId, amm)!.apertureAutomanV4,
      data: getAutomanV4RebalanceCalldata(
        amm,
        mintParams,
        existingPositionId,
        swapData,
        isCollect,
        zapOutParams,
        permitInfo,
      ),
    },
    amounts: {
      amount0Min: amount0Min.toString(),
      amount1Min: amount1Min.toString(),
    },
  };
}
