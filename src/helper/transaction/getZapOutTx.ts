import {
  ApertureSupportedChainId,
  AutomatedMarketMakerEnum,
  PermitInfo,
  getAMMInfo,
} from '@/index';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { Percent } from '@uniswap/sdk-core';
import { Position } from '@uniswap/v3-sdk';
import { BigNumberish } from 'ethers';

import { optimalZapOut } from '../aggregator';
import { getAutomanDecreaseLiquiditySingleCallInfo } from '../automan';
import { PositionDetails } from '../position';

/**
 * Generates an unsigned transaction that decreases liquidity from the specified position and withdraws one token.
 * @param chainId The chain ID.
 * @param ownerAddress The owner address.
 * @param positionId The position ID.
 * @param zeroForOne Whether to swap token0 for token1 or vice versa.
 * @param slippageTolerance The slippage tolerance.
 * @param deadlineEpochSeconds The deadline in seconds since UNIX epoch.
 * @param provider A JSON RPC provider or a base provider.
 * @param position Uniswap SDK Position object for the specified position (optional); if undefined, one will be created.
 * @param permitInfo Optional. If Automan doesn't already have authority over the existing position, this should be populated with valid owner-signed permit info.
 */
export async function getZapOutTx(
  chainId: ApertureSupportedChainId,
  ownerAddress: string,
  positionId: BigNumberish,
  zeroForOne: boolean,
  slippageTolerance: Percent,
  deadlineEpochSeconds: BigNumberish,
  provider: JsonRpcProvider | Provider,
  position?: Position,
  permitInfo?: PermitInfo,
) {
  if (position === undefined) {
    ({ position } = await PositionDetails.fromPositionId(
      chainId,
      positionId,
      provider,
    ));
  }
  const { amount, swapData } = await optimalZapOut(
    chainId,
    positionId,
    zeroForOne,
    0,
    ownerAddress,
    Number(slippageTolerance.numerator.toString()) /
      Number(slippageTolerance.denominator.toString()),
    provider,
  );
  const amountMin = amount.sub(
    amount
      .mul(slippageTolerance.numerator.toString())
      .div(slippageTolerance.denominator.toString()),
  );
  const { data } = getAutomanDecreaseLiquiditySingleCallInfo(
    positionId,
    position.liquidity.toString(),
    zeroForOne,
    deadlineEpochSeconds,
    amountMin,
    0,
    permitInfo,
    swapData,
  );
  return {
    tx: {
      from: ownerAddress,
      to: getAMMInfo(chainId, AutomatedMarketMakerEnum.enum.UNISWAP_V3)!
        .apertureAutoman,
      data,
    },
    amount,
  };
}
