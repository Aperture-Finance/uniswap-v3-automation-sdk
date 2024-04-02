// TODO: migrate optimalMint to viem version
import { SwapRoute, optimalMint } from '@/helper/aggregator';
import { ApertureSupportedChainId } from '@/index';
import { MintParams, calculateMintOptimalPriceImpact, getPool } from '@/viem';
import { FeeAmount, Position } from '@aperture_finance/uniswap-v3-sdk';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { Currency, CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
import Big from 'big.js';
import { BigNumber } from 'ethers';
import { Address, PublicClient } from 'viem';

/**
 * calculates the optimal swap information including swap path info, swap route and price impact for minting liquidity in a decentralized exchange
 * @param chainId The chain ID.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fee The pool fee tier.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param recipient The recipient address.
 * @param deadline The deadline in seconds before which the transaction must be mined.
 * @param slippage The slippage tolerance.
 * @param publicClient Viem public client.
 * @param provider A JSON RPC provider or a base provider.
 * @param use1inch Optional. If set to true, the 1inch aggregator will be used to facilitate the swap.
 */
export async function getOptimalMintSwapInfo(
  chainId: ApertureSupportedChainId,
  token0Amount: CurrencyAmount<Currency>,
  token1Amount: CurrencyAmount<Currency>,
  fee: FeeAmount,
  tickLower: number,
  tickUpper: number,
  recipient: Address,
  deadline: bigint,
  slippage: number,
  publicClient: PublicClient,
  provider: JsonRpcProvider | Provider,
  use1inch?: boolean,
): Promise<{
  swapRoute: SwapRoute | undefined;
  swapPath: SwapPath;
  priceImpact: Big.Big;
}> {
  const {
    amount0: expectedAmount0,
    amount1: expectedAmount1,
    liquidity,
    swapData,
    swapRoute,
  } =
    // TODO: migrate to viem version
    await optimalMint(
      chainId,
      token0Amount as CurrencyAmount<Token>,
      token1Amount as CurrencyAmount<Token>,
      fee,
      tickLower,
      tickUpper,
      recipient,
      slippage,
      provider,
      !use1inch,
    );
  const token0 = (token0Amount.currency as Token).address as Address;
  const token1 = (token1Amount.currency as Token).address as Address;
  const position = new Position({
    pool: await getPool(token0, token1, fee, chainId, publicClient),
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

  const priceImpact = await calculateMintOptimalPriceImpact({
    chainId,
    swapData: swapData as `0x${string}`,
    from: recipient as `0x${string}`,
    mintParams,
    publicClient,
  });
  return {
    swapRoute,
    swapPath: getSwapPath(
      token0Amount as CurrencyAmount<Token>,
      token1Amount as CurrencyAmount<Token>,
      expectedAmount0,
      expectedAmount1,
      slippage,
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
  slippage: number,
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
      .times(1 - slippage * 0.01)
      .toFixed(0),
  };
};
