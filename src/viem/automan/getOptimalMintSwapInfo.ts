import { ApertureSupportedChainId } from '@/index';
import { SwapPath, SwapRoute, optimalMint } from '@/viem';
import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, PublicClient } from 'viem';

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
  blockNumber?: bigint,
): Promise<{
  swapRoute: SwapRoute | undefined;
  swapPath: SwapPath;
  priceImpact: Big.Big;
  finalAmount0: bigint;
  finalAmount1: bigint;
}> {
  const {
    amount0: finalAmount0,
    amount1: finalAmount1,
    swapRoute,
    swapPath,
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
    blockNumber,
    true /** includeSwapInfo */,
  );

  return {
    swapRoute,
    swapPath: swapPath!,
    priceImpact: priceImpact!,
    finalAmount0,
    finalAmount1,
  };
}
