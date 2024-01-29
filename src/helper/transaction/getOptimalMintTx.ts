import {
  ApertureSupportedChainId,
  IUniV3Automan__factory,
  getChainInfo,
} from '@/index';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { Currency, CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
import { FeeAmount, Position } from '@uniswap/v3-sdk';
import Big from 'big.js';
import { BigNumber, BigNumberish } from 'ethers';
import { Address } from 'viem';

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
  const {
    amount0: expectedAmount0,
    amount1: expectedAmount1,
    liquidity,
    swapData,
    swapRoute,
  } = await optimalMint(
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
      to: getChainInfo(chainId).aperture_uniswap_v3_automan,
      data,
      value,
    },
    swapRoute,
    swapPath: getSwapPath(
      token0Amount as CurrencyAmount<Token>,
      token1Amount as CurrencyAmount<Token>,
      expectedAmount0,
      expectedAmount1,
      slippage,
    ),
  };
}

type SwapPath = {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  amountOut: string;
  minAmountOut: string;
};

const getSwapPath = (
  token0: CurrencyAmount<Token>,
  token1: CurrencyAmount<Token>,
  finalToken0Amount: BigNumber,
  finalToken1Amount: BigNumber,
  slippage: number,
): SwapPath => {
  const initToken0Amount = token0.quotient.toString();
  const initToken1Amount = token1.quotient.toString();
  const [tokenIn, tokenOut, amountIn, amountOut] = finalToken0Amount.gt(
    initToken0Amount,
  )
    ? [
        token1.currency,
        token0.currency,
        finalToken1Amount.sub(initToken1Amount).abs(),
        finalToken0Amount.sub(initToken0Amount),
      ]
    : [
        token0.currency,
        token1.currency,
        finalToken0Amount.sub(initToken0Amount).abs(),
        finalToken1Amount.sub(initToken1Amount),
      ];

  return {
    tokenIn: tokenIn.address as Address,
    tokenOut: tokenOut.address as Address,
    amountIn: amountIn.toString(),
    amountOut: amountOut.toString(),
    minAmountOut: new Big(amountOut.toString())
      .times(1 - slippage * 0.01)
      .toFixed(0),
  };
};
