import { ApertureSupportedChainId } from '@/index';
import { RemoveLiquidityOptions } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

import { PositionDetails } from '../position';
import { SolverResult, decreaseLiquidityV4 } from '../solver';
import { E_Solver } from '../solver';

/**
 * Calculates the optimal swap information including swap path info,
 * swap route, and price impact for decreasing liquidity in a decentralized exchange.
 * @param amm The Automated Market Maker.
 * @param chainId The chain ID.
 * @param publicClient Viem public client.
 * @param from The recipient address.
 * @param positionDetails Uniswap SDK PositionDetails for the specified position.
 * @param decreaseLiquidityOptions Decrease liquidity options.
 * @param tokenOut The token to collect the decreased liquidity in.
 * @param isUnwrapNative Optional. Whether to unwrap the native token.
 * @param tokenPricesUsd The prices of the two tokens in the pool in usd.
 * @param includeSolvers Optional. The solvers to include in the quote. If not provided, all solvers will be included.
 * @param blockNumber Optional. The block number to simulate the call from.
 */
export async function getDecreaseLiquidityV4SwapInfo(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
  from: Address,
  positionDetails: PositionDetails,
  decreaseLiquidityOptions: RemoveLiquidityOptions, // RemoveLiquidityOptions can be used for decreasing liquidity (<100%).
  tokenOut: Address,
  isUnwrapNative = true,
  tokenPricesUsd: [string, string],
  includeSolvers?: E_Solver[],
  blockNumber?: bigint,
): Promise<SolverResult> {
  return await decreaseLiquidityV4(
    amm,
    chainId,
    publicClient,
    from,
    positionDetails,
    decreaseLiquidityOptions,
    tokenOut,
    isUnwrapNative,
    tokenPricesUsd,
    includeSolvers,
    blockNumber,
  );
}
