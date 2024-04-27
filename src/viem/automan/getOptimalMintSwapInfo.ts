import { SwapRoute } from '@/helper/aggregator';
import { ApertureSupportedChainId } from '@/index';
import {
  MintParams,
  SwapPath,
  calculateMintOptimalPriceImpact,
  getPool,
  optimalMint,
} from '@/viem';
import { FeeAmount, Position } from '@aperture_finance/uniswap-v3-sdk';
import { Currency, CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
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
 * @param deadline The deadline in seconds before which the transaction must be mined.
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
  deadline: bigint,
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
    liquidity,
    swapData,
    swapRoute,
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
  const position = new Position({
    pool: await getPool(token0, token1, fee, chainId, amm, publicClient),
    liquidity: liquidity.toString(),
    tickLower,
    tickUpper,
  });
  const { amount0, amount1 } = position.mintAmountsWithSlippage(
    new Percent(Math.floor(slippage * 1e6), 1e6),
  );
  const mintParams: MintParams = {
    token0,
    token1,
    fee,
    tickLower,
    tickUpper,
    amount0Desired: BigInt(token0Amount.quotient.toString()),
    amount1Desired: BigInt(token1Amount.quotient.toString()),
    amount0Min: BigInt(amount0.toString()),
    amount1Min: BigInt(amount1.toString()),
    recipient: recipient,
    deadline,
  };

  const { priceImpact, finalAmount0, finalAmount1 } =
    await calculateMintOptimalPriceImpact({
      chainId,
      amm,
      swapData: swapData as `0x${string}`,
      from: recipient as `0x${string}`,
      mintParams,
      publicClient,
    });
  return {
    swapRoute,
    swapPath: getSwapPath(
      token0,
      token1,
      mintParams.amount0Desired,
      mintParams.amount1Desired,
      expectedAmount0,
      expectedAmount1,
      slippage,
    ),
    priceImpact,
    finalAmount0,
    finalAmount1,
  };
}
