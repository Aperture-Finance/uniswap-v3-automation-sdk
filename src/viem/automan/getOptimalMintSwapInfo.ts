import { ApertureSupportedChainId } from '@/index';
import { E_Solver, optimalMintV2 } from '@/viem';
import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
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
 * @param blockNumber Optional. The block number to simulate the call from.
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
  includeSolvers?: E_Solver[],
  blockNumber?: bigint,
) {
  return optimalMintV2(
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
    blockNumber,
    includeSolvers,
  );
}
