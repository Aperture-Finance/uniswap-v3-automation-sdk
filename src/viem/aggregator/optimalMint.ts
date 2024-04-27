import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, PublicClient } from 'viem';

import { MintParams, simulateMintOptimal } from '../automan';
import { getOptimalMintSwapData } from './internal';
import { SwapRoute } from './quote';

/**
 * Get the optimal amount of liquidity to mint for a given pool and token amounts.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fee The pool fee tier.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param fromAddress The address to mint from.
 * @param slippage The slippage tolerance.
 * @param publicClient Viem public client.
 * @param usePool Whether to use the pool or the aggregator for the swap.
 */
export async function optimalMint(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  fee: FeeAmount,
  tickLower: number,
  tickUpper: number,
  fromAddress: Address,
  slippage: number,
  publicClient: PublicClient,
  usePool = false,
) {
  if (!token0Amount.currency.sortsBefore(token1Amount.currency)) {
    throw new Error('token0 must be sorted before token1');
  }
  const mintParams = {
    token0: token0Amount.currency.address as Address,
    token1: token1Amount.currency.address as Address,
    fee,
    tickLower,
    tickUpper,
    amount0Desired: BigInt(token0Amount.quotient.toString()),
    amount1Desired: BigInt(token1Amount.quotient.toString()),
    amount0Min: 0n,
    amount1Min: 0n,
    recipient: fromAddress,
    deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
  };
  const { optimalSwapRouter } = getAMMInfo(chainId, amm)!;

  const poolPromise = optimalMintPool(
    chainId,
    amm,
    publicClient,
    fromAddress,
    mintParams,
  );
  if (!usePool) {
    if (optimalSwapRouter === undefined) {
      return await poolPromise;
    }
    const [poolEstimate, routerEstimate] = await Promise.all([
      poolPromise,
      optimalMintRouter(
        chainId,
        amm,
        publicClient,
        fromAddress,
        mintParams,
        slippage,
      ),
    ]);
    // use the same pool if the quote isn't better
    if (poolEstimate.liquidity > routerEstimate.liquidity) {
      return poolEstimate;
    } else {
      return routerEstimate;
    }
  } else {
    return await poolPromise;
  }
}

async function optimalMintPool(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  fromAddress: Address,
  mintParams: MintParams,
) {
  const [, liquidity, amount0, amount1] = await simulateMintOptimal(
    chainId,
    amm,
    publicClient,
    fromAddress,
    mintParams,
  );
  let swapRoute: SwapRoute = [];
  if (mintParams.amount0Desired.toString() !== amount0.toString()) {
    const [fromTokenAddress, toTokenAddress] = new Big(
      mintParams.amount0Desired.toString(),
    ).gt(amount0.toString())
      ? [mintParams.token0, mintParams.token1]
      : [mintParams.token1, mintParams.token0];
    swapRoute = [
      [
        [
          {
            name: 'Pool',
            part: 100,
            fromTokenAddress: fromTokenAddress,
            toTokenAddress: toTokenAddress,
          },
        ],
      ],
    ];
  }

  return {
    amount0,
    amount1,
    liquidity,
    swapData: '0x',
    swapRoute,
  };
}

async function optimalMintRouter(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  fromAddress: Address,
  mintParams: MintParams,
  slippage: number,
) {
  const { swapData, swapRoute } = await getOptimalMintSwapData(
    chainId,
    amm,
    publicClient,
    mintParams,
    slippage,
    /** blockNumber= */ undefined,
    /** includeRoute= */ true,
  );
  const [, liquidity, amount0, amount1] = await simulateMintOptimal(
    chainId,
    amm,
    publicClient,
    fromAddress,
    mintParams,
    swapData,
    undefined,
  );
  return {
    amount0,
    amount1,
    liquidity,
    swapData,
    swapRoute,
  };
}
