import {
  ApertureSupportedChainId,
  IUniV3Automan__factory,
  getChainInfo,
} from '@/index';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { IncreaseOptions, Position } from '@uniswap/v3-sdk';
import { BigNumberish } from 'ethers';

import { increaseLiquidityOptimal } from '../aggregator';
import { getNativeCurrency } from '../currency';
import { getPool } from '../pool';
import { PositionDetails } from '../position';

/**
 * Generates an unsigned transaction that increase the optimal amount of liquidity for the specified token amounts and position.
 * @param increaseOptions Increase liquidity options.
 * @param chainId The chain ID.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param recipient The recipient address.
 * @param provider A JSON RPC provider or a base provider.
 * @param position The current position to simulate the call from.
 * @param use1inch Optional. If set to true, the 1inch aggregator will be used to facilitate the swap.
 */
export async function getIncreaseLiquidityOptimalTx(
  increaseOptions: IncreaseOptions,
  chainId: ApertureSupportedChainId,
  token0Amount: CurrencyAmount<Currency>,
  token1Amount: CurrencyAmount<Currency>,
  recipient: string,
  provider: JsonRpcProvider | Provider,
  position?: Position,
  use1inch?: boolean,
) {
  if (position === undefined) {
    ({ position } = await PositionDetails.fromPositionId(
      chainId,
      increaseOptions.tokenId.toString(),
      provider,
    ));
  }

  let value: BigNumberish | undefined;
  if (token0Amount.currency.isNative) {
    token0Amount = CurrencyAmount.fromRawAmount(
      getNativeCurrency(chainId).wrapped,
      token0Amount.quotient,
    );
    value = token0Amount.quotient.toString();
  } else if (token1Amount.currency.isNative) {
    token1Amount = CurrencyAmount.fromRawAmount(
      getNativeCurrency(chainId).wrapped,
      token1Amount.quotient,
    );
    value = token1Amount.quotient.toString();
  }

  const { liquidity, swapData } = await increaseLiquidityOptimal(
    chainId,
    provider,
    position,
    increaseOptions,
    token0Amount as CurrencyAmount<Token>,
    token1Amount as CurrencyAmount<Token>,
    recipient,
    !use1inch,
  );
  const token0 = (token0Amount.currency as Token).address;
  const token1 = (token1Amount.currency as Token).address;

  // Same as `position` except that the liquidity field represents the amount of liquidity to add to the existing `position`.
  const incrementalPosition = new Position({
    pool: await getPool(token0, token1, position.pool.fee, chainId, provider),
    liquidity: liquidity.toString(),
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
  });
  const { amount0, amount1 } = incrementalPosition.mintAmountsWithSlippage(
    increaseOptions.slippageTolerance,
  );
  const increaseParams = {
    tokenId: increaseOptions.tokenId as BigNumberish,
    amount0Desired: token0Amount.quotient.toString(),
    amount1Desired: token1Amount.quotient.toString(),
    amount0Min: amount0.toString(),
    amount1Min: amount1.toString(),
    deadline: Math.floor(Date.now() / 1000 + 86400),
  };
  const data = IUniV3Automan__factory.createInterface().encodeFunctionData(
    'increaseLiquidityOptimal',
    [increaseParams, swapData],
  );
  return {
    tx: {
      to: getChainInfo(chainId).aperture_uniswap_v3_automan,
      data,
      value,
    },
    amounts: {
      amount0Min: amount0.toString(),
      amount1Min: amount1.toString(),
    },
  };
}
