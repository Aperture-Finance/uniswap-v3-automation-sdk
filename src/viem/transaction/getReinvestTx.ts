import {
  ApertureSupportedChainId,
  PermitInfo,
  getAMMInfo,
  getLogger,
} from '@/index';
import { Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient, TransactionRequest } from 'viem';

import { getAutomanReinvestCalldata } from '../automan';
import { getFeeReinvestBips } from '../automan/getFees';
import { PositionDetails, viewCollectableTokenAmounts } from '../position';
import { getAmountsWithSlippage } from './transaction';
import { SimulatedAmounts } from './types';

/**
 * Generates an unsigned tx that collects fees and reinvests into the specified position.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param ownerAddress Owner of the specified position.
 * @param positionId Position id.
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
  positionId: bigint,
  slippageTolerance: Percent,
  deadlineEpochSeconds: bigint,
  client: PublicClient,
  permitInfo?: PermitInfo,
): Promise<{
  tx: TransactionRequest;
  amounts: SimulatedAmounts;
}> {
  const { pool, tickLower, tickUpper, position } =
    await PositionDetails.fromPositionId(chainId, amm, positionId, client);
  const { apertureAutoman } = getAMMInfo(chainId, amm)!;

  const collectableTokenAmounts = await viewCollectableTokenAmounts(
    chainId,
    amm,
    positionId,
    client,
  );
  const feeBips = getFeeReinvestBips(position, collectableTokenAmounts);
  getLogger().info(
    `getReinvestTx ownerAddress=${ownerAddress}, amm=${amm}, chainId=${chainId}, nftId=${positionId}, collectableToken0=${collectableTokenAmounts.token0Amount.toSignificant()}, collectableToken1=${collectableTokenAmounts.token1Amount.toSignificant()}, positionToken0=${position.amount0.toSignificant()}, positionToken1=${position.amount1.toSignificant()}, feeBips=${feeBips}`,
  );
  const data = getAutomanReinvestCalldata(
    positionId,
    deadlineEpochSeconds,
    0n /*amount0Min*/, // Setting this to zero for tx simulation.
    0n /*amount1Min*/, // Setting this to zero for tx simulation.
    feeBips,
    permitInfo,
  );
  const amounts = await getAmountsWithSlippage(
    pool,
    tickLower,
    tickUpper,
    apertureAutoman,
    ownerAddress,
    'reinvest',
    data,
    slippageTolerance,
    client,
  );
  return {
    tx: {
      from: ownerAddress,
      to: apertureAutoman,
      data: getAutomanReinvestCalldata(
        positionId,
        deadlineEpochSeconds,
        BigInt(amounts.amount0Min),
        BigInt(amounts.amount1Min),
        feeBips,
        permitInfo,
      ),
    },
    amounts,
  };
}
