// TODO: migrate increaseLiquidityOptimal to viem version
import { increaseLiquidityOptimal } from '@/helper/aggregator';
import { ApertureSupportedChainId } from '@/index';
import { calculateIncreaseLiquidityOptimalPriceImpact, getPool } from '@/viem';
import { IncreaseOptions, Position } from '@aperture_finance/uniswap-v3-sdk';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { Currency, CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
import Big from 'big.js';
import { BigNumber } from 'ethers';
import { Address, PublicClient } from 'viem';

import { PositionDetails } from '../position';

/**
 * calculates the optimal swap information including swap path info, swap route and price impact for adding liquidity in a decentralized exchange
 * @param increaseOptions Increase liquidity options.
 * @param chainId The chain ID.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param recipient The recipient address.
 * @param publicClient Viem public client.
 * @param provider A JSON RPC provider or a base provider.
 * @param position The current position to simulate the call from.
 * @param use1inch Optional. If set to true, the 1inch aggregator will be used to facilitate the swap.
 */
export async function getIncreaseLiquidityOptimalSwapInfo(
  increaseOptions: IncreaseOptions,
  chainId: ApertureSupportedChainId,
  token0Amount: CurrencyAmount<Currency>,
  token1Amount: CurrencyAmount<Currency>,
  recipient: Address,
  publicClient: PublicClient,
  provider: JsonRpcProvider | Provider,
  position?: Position,
  use1inch?: boolean,
) {
  if (position === undefined) {
    ({ position } = await PositionDetails.fromPositionId(
      chainId,
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
  } =
    // TODO: migrate to viem version
    await increaseLiquidityOptimal(
      chainId,
      provider,
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

  const priceImpact = await calculateIncreaseLiquidityOptimalPriceImpact({
    chainId,
    swapData: swapData as `0x${string}`,
    from: recipient as `0x${string}`,
    position,
    increaseParams,
    publicClient,
  });
  return {
    swapRoute,
    swapPath: getSwapPath(
      token0Amount as CurrencyAmount<Token>,
      token1Amount as CurrencyAmount<Token>,
      expectedAmount0,
      expectedAmount1,
      increaseOptions.slippageTolerance,
    ),
    priceImpact,
  };
}

type SwapPath = {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  amountOut: string;
  minAmountOut: string;
};

const getSwapPath = (
  token0: CurrencyAmount<Token>,
  token1: CurrencyAmount<Token>,
  finalToken0Amount: BigNumber,
  finalToken1Amount: BigNumber,
  slippage: Percent,
): SwapPath => {
  const initToken0Amount = token0.quotient.toString();
  const initToken1Amount = token1.quotient.toString();
  const [tokenIn, tokenOut, amountIn, amountOut] = finalToken0Amount.gt(
    initToken0Amount,
  )
    ? [
        token1.currency,
        token0.currency,
        finalToken1Amount.sub(initToken1Amount).abs(),
        finalToken0Amount.sub(initToken0Amount),
      ]
    : [
        token0.currency,
        token1.currency,
        finalToken0Amount.sub(initToken0Amount).abs(),
        finalToken1Amount.sub(initToken1Amount),
      ];

  return {
    tokenIn: tokenIn.address as Address,
    tokenOut: tokenOut.address as Address,
    amountIn: amountIn.toString(),
    amountOut: amountOut.toString(),
    minAmountOut: new Big(amountOut.toString())
      .times(1 - Number(slippage.toFixed()) * 0.01)
      .toFixed(0),
  };
};
