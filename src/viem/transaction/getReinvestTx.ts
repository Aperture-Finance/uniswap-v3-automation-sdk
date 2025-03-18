import {
  ApertureSupportedChainId,
  PermitInfo,
  getAMMInfo,
  getLogger,
} from '@/index';
import { IncreaseOptions } from '@aperture_finance/uniswap-v3-sdk';
import { Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex, PublicClient, TransactionRequest } from 'viem';

import {
  IncreaseLiquidityParams,
  getAutomanReinvestCalldata,
  getAutomanReinvestNoNeedSwapCalldata,
  getAutomanV4ReinvestCalldata,
} from '../automan';
import { getFeeReinvestBips } from '../automan/getFees';
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
export async function getReinvestNoNeedSwapTx(
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
  const data = getAutomanReinvestNoNeedSwapCalldata(
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
      data: getAutomanReinvestNoNeedSwapCalldata(
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

/**
 * Generates an unsigned tx that collects fees and reinvests into the specified position.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param ownerAddress Owner of the specified position.
 * @param increaseOptions Increase liquidity options.
 * @param feeBips The Aperture fee for the transaction.
 * @param swapData The swap data if using a router.
 * @param amount0Expected The expected amount of token0 reinvested.
 * @param amount1Expected The expected amount of token1 reinvested.
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
  amount0Expected: bigint,
  amount1Expected: bigint,
  permitInfo?: PermitInfo,
): Promise<TransactionRequest> {
  const [amount0Slippage, amount1Slippage] = [
    (amount0Expected *
      BigInt(increaseOptions.slippageTolerance.numerator.toString())) /
      BigInt(increaseOptions.slippageTolerance.denominator.toString()),
    (amount1Expected *
      BigInt(increaseOptions.slippageTolerance.numerator.toString())) /
      BigInt(increaseOptions.slippageTolerance.denominator.toString()),
  ];
  const [amount0Min, amount1Min] = [
    amount0Expected - amount0Slippage,
    amount1Expected - amount1Slippage,
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
  amount0Expected: bigint,
  amount1Expected: bigint,
  permitInfo?: PermitInfo,
): Promise<TransactionRequest> {
  const [amount0Slippage, amount1Slippage] = [
    (amount0Expected *
      BigInt(increaseOptions.slippageTolerance.numerator.toString())) /
      BigInt(increaseOptions.slippageTolerance.denominator.toString()),
    (amount1Expected *
      BigInt(increaseOptions.slippageTolerance.numerator.toString())) /
      BigInt(increaseOptions.slippageTolerance.denominator.toString()),
  ];
  const [amount0Min, amount1Min] = [
    amount0Expected - amount0Slippage,
    amount1Expected - amount1Slippage,
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
