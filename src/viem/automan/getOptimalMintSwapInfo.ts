import { SwapRoute } from '@/helper/aggregator';
import { ApertureSupportedChainId } from '@/index';
import { SwapPath, optimalMint } from '@/viem';
import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, PublicClient } from 'viem';

import { getSwapPath } from './internal';

/**
 * calculates the optimal swap information including swap path info, swap route and price impact for minting liquidity in a decentralized exchange
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fee The pool fee tier.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param recipient The recipient address.
 * @param slippage The slippage tolerance.
 * @param publicClient Viem public client.
 * @param use1inch Optional. If set to true, the 1inch aggregator will be used to facilitate the swap.
 */
export async function getOptimalMintSwapInfo(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0Amount: CurrencyAmount<Currency>,
  token1Amount: CurrencyAmount<Currency>,
  fee: FeeAmount,
  tickLower: number,
  tickUpper: number,
  recipient: Address,
  slippage: number,
  publicClient: PublicClient,
  use1inch?: boolean,
): Promise<{
  swapRoute: SwapRoute | undefined;
  swapPath: SwapPath;
  priceImpact: Big.Big;
  finalAmount0: bigint;
  finalAmount1: bigint;
}> {
  const {
    amount0: expectedAmount0,
    amount1: expectedAmount1,
    swapRoute,
    priceImpact,
  } = await optimalMint(
    chainId,
    amm,
    token0Amount as CurrencyAmount<Token>,
    token1Amount as CurrencyAmount<Token>,
    fee,
    tickLower,
    tickUpper,
    recipient,
    slippage,
    publicClient,
    !use1inch,
  );
  const token0 = (token0Amount.currency as Token).address as Address;
  const token1 = (token1Amount.currency as Token).address as Address;

  return {
    swapRoute,
    swapPath: getSwapPath(
      token0,
      token1,
      BigInt(token0Amount.quotient.toString()),
      BigInt(token1Amount.quotient.toString()),
      expectedAmount0,
      expectedAmount1,
      slippage,
    ),
    priceImpact,
    finalAmount0: expectedAmount0,
    finalAmount1: expectedAmount1,
  };
}
