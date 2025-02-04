import { ApertureSupportedChainId } from '@/index';
import { E_Solver, mintOptimalV4 } from '@/viem';
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

/**
 * calculates the optimal swap information including swap path info, swap route and price impact for minting liquidity in a decentralized exchange
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param feeOrTickSpacing The pool fee tier (for non-SlipStream AMM) or the pool tick spacing (for SlipStream).
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param recipient The recipient address.
 * @param slippage The slippage tolerance.
 * @param tokenPricesUsd The token prices in USD.
 * @param publicClient Viem public client.
 * @param includeSolvers Optional. The solvers to include.
 * @param blockNumber Optional. The block number to simulate the call from.
 */
export async function getMintOptimalSwapInfoV4(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0Amount: CurrencyAmount<Currency>,
  token1Amount: CurrencyAmount<Currency>,
  feeOrTickSpacing: number,
  tickLower: number,
  tickUpper: number,
  fromAddress: Address,
  slippage: number,
  tokenPricesUsd: [string, string],
  publicClient: PublicClient,
  includeSolvers?: E_Solver[],
  blockNumber?: bigint,
) {
  return mintOptimalV4(
    chainId,
    amm,
    token0Amount as CurrencyAmount<Token>,
    token1Amount as CurrencyAmount<Token>,
    feeOrTickSpacing,
    tickLower,
    tickUpper,
    fromAddress,
    slippage,
    tokenPricesUsd,
    publicClient,
    blockNumber,
    includeSolvers,
  );
}
