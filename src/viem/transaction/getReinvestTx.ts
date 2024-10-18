import {
  ApertureSupportedChainId,
  PermitInfo,
  getAMMInfo,
  getLogger,
} from '@/index';
import { Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient, TransactionRequest } from 'viem';

import {
  getAutomanReinvestCalldata,
  getAutomanV3ReinvestCalldata,
} from '../automan';
import {
  getFeeReinvestBips,
  getFeeReinvestFeeAmount,
} from '../automan/getFees';
import { PositionDetails } from '../position';
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
  const positionDetails = await PositionDetails.fromPositionId(
    chainId,
    amm,
    positionId,
    client,
  );
  const { pool, tickLower, tickUpper, position } = positionDetails;
  const { apertureAutoman } = getAMMInfo(chainId, amm)!;

  const feeBips = getFeeReinvestBips(positionDetails);
  getLogger().info('SDK.getReinvestTx.Fees', {
    ownerAddress,
    amm,
    chainId,
    positionId,
    collectableToken0: positionDetails.tokensOwed0.toSignificant(),
    collectableToken1: positionDetails.tokensOwed1.toSignificant(),
    positionToken0: position.amount0.toSignificant(),
    positionToken1: position.amount1.toSignificant(),
    feeBips,
  });
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

// Same as getReinvestTx, but with feeAmounts instead of feeBips.
// Do not use, but implemented to make it easier to migrate to future versions.
export async function getReinvestV3Tx(
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
  const positionDetails = await PositionDetails.fromPositionId(
    chainId,
    amm,
    positionId,
    client,
  );
  const { pool, tickLower, tickUpper, position } = positionDetails;
  const { apertureAutomanV3 } = getAMMInfo(chainId, amm)!;

  const { token0FeeAmount, token1FeeAmount } =
    getFeeReinvestFeeAmount(positionDetails);
  getLogger().info('SDK.getReinvestV3Tx.Fees', {
    ownerAddress,
    amm,
    chainId,
    positionId,
    collectableToken0: positionDetails.tokensOwed0.toSignificant(),
    collectableToken1: positionDetails.tokensOwed1.toSignificant(),
    positionToken0: position.amount0.toSignificant(),
    positionToken1: position.amount1.toSignificant(),
    token0FeeAmount,
    token1FeeAmount,
  });
  const data = getAutomanV3ReinvestCalldata(
    positionId,
    deadlineEpochSeconds,
    0n /*amount0Min*/, // Setting this to zero for tx simulation.
    0n /*amount1Min*/, // Setting this to zero for tx simulation.
    token0FeeAmount,
    token1FeeAmount,
    permitInfo,
  );
  const amounts = await getAmountsWithSlippage(
    pool,
    tickLower,
    tickUpper,
    apertureAutomanV3,
    ownerAddress,
    'reinvest',
    data,
    slippageTolerance,
    client,
  );
  return {
    tx: {
      from: ownerAddress,
      to: apertureAutomanV3,
      data: getAutomanV3ReinvestCalldata(
        positionId,
        deadlineEpochSeconds,
        BigInt(amounts.amount0Min),
        BigInt(amounts.amount1Min),
        token0FeeAmount,
        token1FeeAmount,
        permitInfo,
      ),
    },
    amounts,
  };
}
