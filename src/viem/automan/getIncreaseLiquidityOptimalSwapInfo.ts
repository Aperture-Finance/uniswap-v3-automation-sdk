import { ApertureSupportedChainId } from '@/index';
import { IncreaseOptions, Position } from '@aperture_finance/uniswap-v3-sdk';
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

import { PositionDetails } from '../position';
import { increaseLiquidityOptimalV4 } from '../solver';
import { E_Solver } from '../solver';

/**
 * Calculates the optimal swap information including swap path info, swap route and price impact for adding liquidity in a decentralized exchange
 * @param increaseOptions Increase liquidity options.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fromAddress The address to increase liquidity from.
 * @param tokenPricesUsd The token prices in USD.
 * @param publicClient Viem public client.
 * @param includeSolvers Optional. The solvers to include.
 * @param position The current position to simulate the call from.
 * @param blockNumber Optional. The block number to simulate the call from.
 */
export async function getIncreaseLiquidityOptimalSwapInfoV4(
  increaseOptions: IncreaseOptions,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0Amount: CurrencyAmount<Currency>,
  token1Amount: CurrencyAmount<Currency>,
  fromAddress: Address,
  tokenPricesUsd: [string, string],
  publicClient: PublicClient,
  includeSolvers?: E_Solver[],
  position?: Position,
  blockNumber?: bigint,
) {
  if (position === undefined) {
    ({ position } = await PositionDetails.fromPositionId(
      chainId,
      amm,
      BigInt(increaseOptions.tokenId.toString()),
      publicClient,
    ));
  }

  return await increaseLiquidityOptimalV4(
    chainId,
    amm,
    publicClient,
    position,
    increaseOptions,
    token0Amount as CurrencyAmount<Token>,
    token1Amount as CurrencyAmount<Token>,
    fromAddress,
    tokenPricesUsd,
    includeSolvers,
    blockNumber,
  );
}
