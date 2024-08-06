import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { IncreaseOptions, Position } from '@aperture_finance/uniswap-v3-sdk';
import { Currency, CurrencyAmount } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex, PublicClient, TransactionRequest } from 'viem';

import { getAutomanIncreaseLiquidityOptimalCallData } from '../automan';
import { getNativeCurrency } from '../currency';
import { PositionDetails } from '../position';
import { SimulatedAmounts } from './types';

/**
 * Generates an unsigned transaction that increase the optimal amount of liquidity for the specified token amounts and position.
 * @param increaseOptions Increase liquidity options.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param from The address to send the transaction from.
 * @param publicClient Viem public client.
 * @param swapData Swap data for the position.
 * @param liquidity The amount of liquidity to add to the existing position.
 * @param position The current position to simulate the call from.
 */
export async function getIncreaseLiquidityOptimalTx(
  increaseOptions: IncreaseOptions,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0Amount: CurrencyAmount<Currency>,
  token1Amount: CurrencyAmount<Currency>,
  from: Address,
  publicClient: PublicClient,
  swapData: Hex,
  liquidity: bigint,
  position?: Position,
): Promise<{
  tx: TransactionRequest;
  amounts: SimulatedAmounts;
}> {
  if (position === undefined) {
    ({ position } = await PositionDetails.fromPositionId(
      chainId,
      amm,
      BigInt(increaseOptions.tokenId.toString()),
      publicClient,
    ));
  }

  let value: bigint | undefined;
  if (token0Amount.currency.isNative) {
    token0Amount = CurrencyAmount.fromRawAmount(
      getNativeCurrency(chainId).wrapped,
      token0Amount.quotient,
    );
    value = BigInt(token0Amount.quotient.toString());
  } else if (token1Amount.currency.isNative) {
    token1Amount = CurrencyAmount.fromRawAmount(
      getNativeCurrency(chainId).wrapped,
      token1Amount.quotient,
    );
    value = BigInt(token1Amount.quotient.toString());
  }

  // Same as `position` except that the liquidity field represents the amount of liquidity to add to the existing `position`.
  const incrementalPosition = new Position({
    pool: position.pool,
    liquidity: liquidity.toString(),
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
  });
  const { amount0, amount1 } = incrementalPosition.mintAmountsWithSlippage(
    increaseOptions.slippageTolerance,
  );
  const increaseParams = {
    tokenId: BigInt(increaseOptions.tokenId.toString()),
    amount0Desired: BigInt(token0Amount.quotient.toString()),
    amount1Desired: BigInt(token1Amount.quotient.toString()),
    amount0Min: BigInt(amount0.toString()),
    amount1Min: BigInt(amount1.toString()),
    deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
  };

  const data = getAutomanIncreaseLiquidityOptimalCallData(
    increaseParams,
    swapData,
  );

  return {
    tx: {
      to: getAMMInfo(chainId, amm)!.apertureAutoman,
      data,
      value,
      from,
    },
    amounts: {
      amount0Min: amount0.toString(),
      amount1Min: amount1.toString(),
    },
  };
}
