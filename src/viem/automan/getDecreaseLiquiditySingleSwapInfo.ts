import { ApertureSupportedChainId } from '@/index';
import { RemoveLiquidityOptions } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

import { PositionDetails } from '../position';
import { SolverResult, decreaseLiquiditySingleV3 } from '../solver';
import { E_Solver } from '../solver';

/**
 * calculates the optimal swap information including swap path info, swap route and price impact for adding liquidity in a decentralized exchange
 * @param removeLiquidityOptions Decrease liquidity options.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param recipient The recipient address.
 * @param publicClient Viem public client.
 * @param position The current position to simulate the call from.
 * @param blockNumber Optional. The block number to simulate the call from.
 */
export async function getDecreaseLiquiditySingleSwapInfoV3(
  removeLiquidityOptions: RemoveLiquidityOptions,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  zeroForOne: boolean,
  recipient: Address,
  tokenPricesUsd: [string, string],
  publicClient: PublicClient,
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

  return await decreaseLiquiditySingleV3(
    chainId,
    amm,
    publicClient,
    positionDetails,
    removeLiquidityOptions,
    zeroForOne,
    recipient,
    tokenPricesUsd,
    blockNumber,
    includeSolvers,
  );
}
