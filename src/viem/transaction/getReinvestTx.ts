import { ApertureSupportedChainId, PermitInfo, getAMMInfo } from '@/index';
import { IncreaseOptions } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex, TransactionRequest } from 'viem';

import {
  IncreaseLiquidityParams,
  getAutomanReinvestCalldata,
  getAutomanV4ReinvestCalldata,
} from '../automan';

/**
 * Generates an unsigned tx that collects fees and reinvests into the specified position.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param ownerAddress Owner of the specified position.
 * @param increaseOptions Increase liquidity options.
 * @param feeBips The Aperture fee for the transaction.
 * @param swapData The swap data if using a router.
 * @param amount0Min The minimum amount of token0 reinvested.
 * @param amount1Min The minimum amount of token1 reinvested.
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
  amount0: bigint,
  amount1: bigint,
  permitInfo?: PermitInfo,
): Promise<TransactionRequest> {
  const [amount0Slippage, amount1Slippage] = [
    (amount0 * BigInt(increaseOptions.slippageTolerance.numerator.toString())) /
      BigInt(increaseOptions.slippageTolerance.denominator.toString()),
    (amount1 * BigInt(increaseOptions.slippageTolerance.numerator.toString())) /
      BigInt(increaseOptions.slippageTolerance.denominator.toString()),
  ];
  const [amount0Min, amount1Min] = [
    amount0 - amount0Slippage,
    amount1 - amount1Slippage,
  ];
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
export async function getReinvestV4Tx(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  ownerAddress: Address,
  increaseOptions: IncreaseOptions,
  token0FeeAmount: bigint,
  token1FeeAmount: bigint,
  swapData: Hex,
  amount0: bigint,
  amount1: bigint,
  permitInfo?: PermitInfo,
): Promise<TransactionRequest> {
  const [amount0Slippage, amount1Slippage] = [
    (amount0 * BigInt(increaseOptions.slippageTolerance.numerator.toString())) /
      BigInt(increaseOptions.slippageTolerance.denominator.toString()),
    (amount1 * BigInt(increaseOptions.slippageTolerance.numerator.toString())) /
      BigInt(increaseOptions.slippageTolerance.denominator.toString()),
  ];
  const [amount0Min, amount1Min] = [
    amount0 - amount0Slippage,
    amount1 - amount1Slippage,
  ];
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
    to: getAMMInfo(chainId, amm)!.apertureAutomanV4,
    data: getAutomanV4ReinvestCalldata(
      increaseLiquidityParams,
      token0FeeAmount,
      token1FeeAmount,
      swapData,
      permitInfo,
    ),
  };
}
