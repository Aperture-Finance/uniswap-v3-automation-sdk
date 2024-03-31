import {
  ApertureSupportedChainId,
  IUniV3Automan__factory,
  getChainInfoAMM,
} from '@/index';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { Currency, CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
import { FeeAmount, Position } from '@uniswap/v3-sdk';
import { BigNumberish } from 'ethers';

import { optimalMint } from '../aggregator';
import { getNativeCurrency } from '../currency';
import { getPool } from '../pool';

/**
 * Generates an unsigned transaction that mints the optimal amount of liquidity for the specified token amounts and price range.
 * @param chainId The chain ID.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fee The pool fee tier.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param recipient The recipient address.
 * @param deadline The deadline in seconds before which the transaction must be mined.
 * @param slippage The slippage tolerance.
 * @param provider A JSON RPC provider or a base provider.
 * @param use1inch Optional. If set to true, the 1inch aggregator will be used to facilitate the swap.
 */
export async function getOptimalMintTx(
  chainId: ApertureSupportedChainId,
  token0Amount: CurrencyAmount<Currency>,
  token1Amount: CurrencyAmount<Currency>,
  fee: FeeAmount,
  tickLower: number,
  tickUpper: number,
  recipient: string,
  deadline: BigNumberish,
  slippage: number,
  provider: JsonRpcProvider | Provider,
  use1inch?: boolean,
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
  const { liquidity, swapData } = await optimalMint(
    chainId,
    token0Amount as CurrencyAmount<Token>,
    token1Amount as CurrencyAmount<Token>,
    fee,
    tickLower,
    tickUpper,
    recipient,
    slippage,
    provider,
    !use1inch,
  );
  const token0 = (token0Amount.currency as Token).address;
  const token1 = (token1Amount.currency as Token).address;
  const position = new Position({
    pool: await getPool(token0, token1, fee, chainId, provider),
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
  const data = IUniV3Automan__factory.createInterface().encodeFunctionData(
    'mintOptimal',
    [mintParams, swapData],
  );
  return {
    tx: {
      to: getChainInfoAMM(chainId).ammToInfo.get('UNISWAP')?.apertureAutoman!,
      data,
      value,
    },
    amounts: {
      amount0Min: amount0.toString(),
      amount1Min: amount1.toString(),
    },
  };
}
