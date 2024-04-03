import { ApertureSupportedChainId, PermitInfo, getAMMInfo } from '@/index';
import { Provider, TransactionRequest } from '@ethersproject/providers';
import { Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { BigNumberish } from 'ethers';

import { getAutomanReinvestCallInfo } from '../automan';
import { PositionDetails } from '../position';
import { SimulatedAmounts, getAmountsWithSlippage } from './transaction';

/**
 * Generates an unsigned tx that collects fees and reinvests into the specified position.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param ownerAddress Owner of the specified position.
 * @param positionId Position id.
 * @param slippageTolerance How much the reinvested amount of either token0 or token1 is allowed to change unfavorably.
 * @param deadlineEpochSeconds Timestamp when the tx expires (in seconds since epoch).
 * @param provider Ethers provider.
 * @param permitInfo Optional. If Automan doesn't already have authority over the existing position, this should be populated with a valid owner-signed permit info.
 * @returns The generated transaction request and expected amounts.
 */
export async function getReinvestTx(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  ownerAddress: string,
  positionId: BigNumberish,
  slippageTolerance: Percent,
  deadlineEpochSeconds: BigNumberish,
  provider: Provider,
  permitInfo?: PermitInfo,
): Promise<{
  tx: TransactionRequest;
  amounts: SimulatedAmounts;
}> {
  const { pool, tickLower, tickUpper } = await PositionDetails.fromPositionId(
    chainId,
    amm,
    positionId,
    provider,
  );
  const { apertureAutoman } = getAMMInfo(chainId, amm)!;
  const { functionFragment, data } = getAutomanReinvestCallInfo(
    positionId,
    deadlineEpochSeconds,
    0, // Setting this to zero for tx simulation.
    0, // Setting this to zero for tx simulation.
    0,
    permitInfo,
  );
  const amounts = await getAmountsWithSlippage(
    pool,
    tickLower,
    tickUpper,
    apertureAutoman,
    ownerAddress,
    functionFragment,
    data,
    slippageTolerance,
    provider,
  );
  return {
    tx: {
      from: ownerAddress,
      to: apertureAutoman,
      data: getAutomanReinvestCallInfo(
        positionId,
        deadlineEpochSeconds,
        amounts.amount0Min,
        amounts.amount1Min,
        0,
        permitInfo,
      ).data,
    },
    amounts,
  };
}
