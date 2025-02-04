import { ApertureSupportedChainId } from '@/index';
import { RemoveLiquidityOptions } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

import { PositionDetails } from '../position';
import { SolverResult, decreaseLiquiditySingle } from '../solver';
import { E_Solver } from '../solver';

/**
 * calculates the optimal swap information including swap path info, swap route and price impact for adding liquidity in a decentralized exchange
 * @param removeLiquidityOptions Decrease liquidity options.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param zeroForOne If true, collect in token1. If false, collect in token0.
 * @param recipient The recipient address.
 * @param tokenPricesUsd The prices of the two tokens in the pool in usd.
 * @param publicClient Viem public client.
 * @param includeSolvers Optional. The solvers to include in the quote. If not provided, all solvers will be included.
 * @param positionDetails Uniswap SDK PositionDetails for the specified position (optional); if undefined, one will be created.
 * @param blockNumber Optional. The block number to simulate the call from.
 */
export async function getDecreaseLiquiditySingleSwapInfo(
  removeLiquidityOptions: RemoveLiquidityOptions,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  zeroForOne: boolean,
  recipient: Address,
  tokenPricesUsd: [string, string],
  publicClient: PublicClient,
  isUnwrapNative = true,
  includeSolvers?: E_Solver[],
  positionDetails?: PositionDetails,
  blockNumber?: bigint,
): Promise<SolverResult[]> {
  if (positionDetails === undefined) {
    positionDetails = await PositionDetails.fromPositionId(
      chainId,
      amm,
      BigInt(removeLiquidityOptions.tokenId.toString()),
      publicClient,
      blockNumber,
    );
  }

  return await decreaseLiquiditySingle(
    chainId,
    amm,
    publicClient,
    positionDetails,
    removeLiquidityOptions,
    zeroForOne,
    recipient,
    tokenPricesUsd,
    isUnwrapNative,
    blockNumber,
    includeSolvers,
  );
}
