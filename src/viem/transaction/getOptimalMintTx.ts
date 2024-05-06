import {
  ApertureSupportedChainId,
  Automan__factory,
  getAMMInfo,
} from '@/index';
import { FeeAmount, Position } from '@aperture_finance/uniswap-v3-sdk';
import { Currency, CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { BigNumberish } from 'ethers';
import { Address, Hex, PublicClient } from 'viem';

import { getNativeCurrency } from '../currency';
import { getPool } from '../pool';

// TODO: add unit test
/**
 * Generates an unsigned transaction that mints the optimal amount of liquidity for the specified token amounts and price range.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fee The pool fee tier.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param recipient The recipient address.
 * @param deadline The deadline in seconds before which the transaction must be mined.
 * @param slippage The slippage tolerance.
 * @param publicClient Viem public client.
 * @param use1inch Optional. If set to true, the 1inch aggregator will be used to facilitate the swap.
 */
export async function getOptimalMintTx(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0Amount: CurrencyAmount<Currency>,
  token1Amount: CurrencyAmount<Currency>,
  fee: FeeAmount,
  tickLower: number,
  tickUpper: number,
  recipient: Address,
  deadline: bigint,
  slippage: number,
  publicClient: PublicClient,
  swapData: Hex,
  liquidity: bigint,
) {
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

  const token0 = (token0Amount.currency as Token).address;
  const token1 = (token1Amount.currency as Token).address;
  const position = new Position({
    pool: await getPool(token0, token1, fee, chainId, amm, publicClient),
    liquidity: liquidity.toString(),
    tickLower,
    tickUpper,
  });
  const { amount0, amount1 } = position.mintAmountsWithSlippage(
    new Percent(Math.floor(slippage * 1e6), 1e6),
  );
  const mintParams = {
    token0,
    token1,
    fee,
    tickLower,
    tickUpper,
    amount0Desired: token0Amount.quotient.toString(),
    amount1Desired: token1Amount.quotient.toString(),
    amount0Min: amount0.toString(),
    amount1Min: amount1.toString(),
    recipient,
    deadline,
  };
  const data = Automan__factory.createInterface().encodeFunctionData(
    'mintOptimal',
    [mintParams, swapData],
  );
  return {
    tx: {
      to: getAMMInfo(chainId, amm)!.apertureAutoman,
      data,
      value,
    },
    amounts: {
      amount0Min: amount0.toString(),
      amount1Min: amount1.toString(),
    },
  };
}
