import { ApertureSupportedChainId, PermitInfo, getAMMInfo } from '@/index';
import { IncreaseOptions } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex, TransactionRequest } from 'viem';

import {
  IncreaseLiquidityParams,
  getAutomanReinvestCalldata,
  getAutomanV3ReinvestCalldata,
} from '../automan';

/**
 * Generates an unsigned tx that collects fees and reinvests into the specified position.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param ownerAddress Owner of the specified position.
 * @param slippageTolerance How much the reinvested amount of either token0 or token1 is allowed to change unfavorably.
 * @param deadlineEpochSeconds Timestamp when the tx expires (in seconds since epoch).
 * @param client Public client.
 * @param permitInfo Optional. If Automan doesn't already have authority over the existing position, this should be populated with a valid owner-signed permit info.
 * @returns The generated transaction request and expected amounts.
 */
export async function getReinvestTx(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  ownerAddress: Address,
  increaseOptions: IncreaseOptions,
  feeBips: bigint,
  swapData: Hex,
  amount0Min: bigint,
  amount1Min: bigint,
  permitInfo?: PermitInfo,
): Promise<TransactionRequest> {
  const increaseLiquidityParams: IncreaseLiquidityParams = {
    tokenId: BigInt(increaseOptions.tokenId.toString()),
    amount0Desired: 0n, // Not used.
    amount1Desired: 0n, // Not used.
    amount0Min,
    amount1Min,
    deadline: BigInt(increaseOptions.deadline.toString()),
  };
  return {
    from: ownerAddress,
    to: getAMMInfo(chainId, amm)!.apertureAutoman,
    data: getAutomanReinvestCalldata(
      increaseLiquidityParams,
      feeBips,
      swapData,
      permitInfo,
    ),
  };
}

// Same as getReinvestTx, but with feeAmounts instead of feeBips.
// Don't have to use, but implemented to make it easier to migrate to future versions.
export async function getReinvestV3Tx(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  ownerAddress: Address,
  increaseOptions: IncreaseOptions,
  token0FeeAmount: bigint,
  token1FeeAmount: bigint,
  swapData: Hex,
  amount0Min: bigint,
  amount1Min: bigint,
  permitInfo?: PermitInfo,
): Promise<TransactionRequest> {
  const increaseLiquidityParams: IncreaseLiquidityParams = {
    tokenId: BigInt(increaseOptions.tokenId.toString()),
    amount0Desired: 0n, // Not used.
    amount1Desired: 0n, // Not used.
    amount0Min,
    amount1Min,
    deadline: BigInt(increaseOptions.deadline.toString()),
  };
  return {
    from: ownerAddress,
    to: getAMMInfo(chainId, amm)!.apertureAutomanV3,
    data: getAutomanV3ReinvestCalldata(
      increaseLiquidityParams,
      token0FeeAmount,
      token1FeeAmount,
      swapData,
      permitInfo,
    ),
  };
}
