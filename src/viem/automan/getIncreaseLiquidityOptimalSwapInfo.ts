import { ApertureSupportedChainId } from '@/index';
import { calculateIncreaseLiquidityOptimalPriceImpact, getPool } from '@/viem';
import { IncreaseOptions, Position } from '@aperture_finance/uniswap-v3-sdk';
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

import { increaseLiquidityOptimal } from '../aggregator';
import { PositionDetails } from '../position';
import { getSwapPath } from './internal';

/**
 * calculates the optimal swap information including swap path info, swap route and price impact for adding liquidity in a decentralized exchange
 * @param increaseOptions Increase liquidity options.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param recipient The recipient address.
 * @param publicClient Viem public client.
 * @param position The current position to simulate the call from.
 * @param use1inch Optional. If set to true, the 1inch aggregator will be used to facilitate the swap.
 */
export async function getIncreaseLiquidityOptimalSwapInfo(
  increaseOptions: IncreaseOptions,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0Amount: CurrencyAmount<Currency>,
  token1Amount: CurrencyAmount<Currency>,
  recipient: Address,
  publicClient: PublicClient,
  position?: Position,
  use1inch?: boolean,
) {
  if (position === undefined) {
    ({ position } = await PositionDetails.fromPositionId(
      chainId,
      amm,
      BigInt(increaseOptions.tokenId.toString()),
      publicClient,
    ));
  }

  const {
    amount0: expectedAmount0,
    amount1: expectedAmount1,
    liquidity,
    swapData,
    swapRoute,
  } = await increaseLiquidityOptimal(
    chainId,
    amm,
    publicClient,
    position,
    increaseOptions,
    token0Amount as CurrencyAmount<Token>,
    token1Amount as CurrencyAmount<Token>,
    recipient,
    !use1inch,
  );
  const token0 = (token0Amount.currency as Token).address as Address;
  const token1 = (token1Amount.currency as Token).address as Address;

  // Same as `position` except that the liquidity field represents the amount of liquidity to add to the existing `position`.
  const incrementalPosition = new Position({
    pool: await getPool(
      token0,
      token1,
      position.pool.fee,
      chainId,
      amm,
      publicClient,
    ),
    liquidity: liquidity.toString(),
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
  });
  const { amount0, amount1 } = incrementalPosition.mintAmountsWithSlippage(
    increaseOptions.slippageTolerance,
  );
  const increaseParams = {
    tokenId: BigInt(increaseOptions.tokenId.toString()),
    amount0Desired: BigInt(token0Amount.quotient.toString()),
    amount1Desired: BigInt(token1Amount.quotient.toString()),
    amount0Min: BigInt(amount0.toString()),
    amount1Min: BigInt(amount1.toString()),
    deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
  };

  const { priceImpact, finalAmount0, finalAmount1 } =
    await calculateIncreaseLiquidityOptimalPriceImpact({
      chainId,
      amm,
      swapData: swapData as `0x${string}`,
      from: recipient as `0x${string}`,
      position,
      increaseParams,
      publicClient,
    });
  return {
    swapRoute,
    swapPath: getSwapPath(
      token0,
      token1,
      increaseParams.amount0Desired,
      increaseParams.amount1Desired,
      expectedAmount0,
      expectedAmount1,
      Number(increaseOptions.slippageTolerance.toFixed()),
    ),
    priceImpact,
    finalAmount0,
    finalAmount1,
  };
}
