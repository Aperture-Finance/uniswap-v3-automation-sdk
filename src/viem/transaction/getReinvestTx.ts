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
  IncreaseLiquidityParams,
  getAutomanReinvestCalldata,
  getAutomanV4ReinvestCalldata,
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
export async function getReinvestV4Tx(
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
  const { apertureAutomanV4 } = getAMMInfo(chainId, amm)!;

  const { token0FeeAmount, token1FeeAmount } =
    getFeeReinvestFeeAmount(positionDetails);
  getLogger().info('SDK.getReinvestV4Tx.Fees', {
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
  const increaseLiquidityParams: IncreaseLiquidityParams = {
    tokenId: positionId,
    amount0Desired: 0n, // Param value ignored by Automan.
    amount1Desired: 0n, // Param value ignored by Automan.
    amount0Min: 0n, // Setting this to zero for tx simulation.
    amount1Min: 0n, // Setting this to zero for tx simulation.
    deadline: deadlineEpochSeconds,
  };
  const data = getAutomanV4ReinvestCalldata(
    increaseLiquidityParams,
    token0FeeAmount,
    token1FeeAmount,
    /* swapData= */ undefined,
    permitInfo,
  );
  const amounts = await getAmountsWithSlippage(
    pool,
    tickLower,
    tickUpper,
    apertureAutomanV4,
    ownerAddress,
    'reinvest',
    data,
    slippageTolerance,
    client,
  );
  [increaseLiquidityParams.amount0Min, increaseLiquidityParams.amount1Min] = [
    BigInt(amounts.amount0Min),
    BigInt(amounts.amount1Min),
  ];
  return {
    tx: {
      from: ownerAddress,
      to: apertureAutomanV4,
      data: getAutomanV4ReinvestCalldata(
        increaseLiquidityParams,
        token0FeeAmount,
        token1FeeAmount,
        /* swapData= */ undefined,
        permitInfo,
      ),
    },
    amounts,
  };
}
