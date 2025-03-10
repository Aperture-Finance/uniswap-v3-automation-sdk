import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { Pool, Position } from '@aperture_finance/uniswap-v3-sdk';
import { Currency, CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex, PublicClient, TransactionRequest } from 'viem';

import {
  SlipStreamMintParams,
  UniV3MintParams,
  getAutomanMintFromTokenInCalldata,
  getAutomanV4MintOptimalCalldata,
} from '../automan';
import { getNativeCurrency } from '../currency';
import { getPool } from '../pool';
import { SimulatedAmounts } from './types';

/**
 * Generates an unsigned transaction that mints the optimal amount of liquidity for the specified token amounts and price range.
 * Includes feeAmount and enables initilizing pool with sqrtPriceX96.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param feeOrTickSpacing The pool fee tier or tick spacing.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param recipient The recipient address.
 * @param deadline The deadline in seconds before which the transaction must be mined.
 * @param slippage The slippage tolerance.
 * @param publicClient Viem public client.
 * @param swapData Swap data for the position, returned by getRebalanceSwapInfo.
 * @param liquidity The amount of liquidity to mint.
 * @param token0FeeAmount The token0 fee amount.
 * @param token1FeeAmount The token1 fee amount.
 */
export async function getMintOptimalV4Tx(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0Amount: CurrencyAmount<Currency>,
  token1Amount: CurrencyAmount<Currency>,
  feeOrTickSpacing: number,
  tickLower: number,
  tickUpper: number,
  recipient: Address,
  deadline: bigint,
  slippage: number,
  publicClient: PublicClient,
  swapData: Hex,
  liquidity: bigint,
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
): Promise<{
  tx: TransactionRequest;
  amounts: SimulatedAmounts;
}> {
  let value: bigint | undefined;
  if (token0Amount.currency.isNative) {
    token0Amount = CurrencyAmount.fromRawAmount(
      getNativeCurrency(chainId).wrapped,
      token0Amount.quotient,
    );
    value = BigInt(token0Amount.quotient.toString());
  } else if (token1Amount.currency.isNative) {
    token1Amount = CurrencyAmount.fromRawAmount(
      getNativeCurrency(chainId).wrapped,
      token1Amount.quotient,
    );
    value = BigInt(token1Amount.quotient.toString());
  }

  const token0 = (token0Amount.currency as Token).address as Address;
  const token1 = (token1Amount.currency as Token).address as Address;
  const position = new Position({
    pool: await getPool(
      token0,
      token1,
      feeOrTickSpacing,
      chainId,
      amm,
      publicClient,
    ),
    liquidity: liquidity.toString(),
    tickLower,
    tickUpper,
  });
  const { amount0, amount1 } = position.mintAmountsWithSlippage(
    new Percent(Math.floor(slippage * 1e6), 1e6),
  );
  const mintParams: SlipStreamMintParams | UniV3MintParams =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? {
          token0,
          token1,
          tickSpacing: feeOrTickSpacing,
          tickLower,
          tickUpper,
          amount0Desired: BigInt(token0Amount.quotient.toString()),
          amount1Desired: BigInt(token1Amount.quotient.toString()),
          amount0Min: BigInt(amount0.toString()),
          amount1Min: BigInt(amount1.toString()),
          recipient,
          deadline,
          sqrtPriceX96: 0n,
        }
      : {
          token0,
          token1,
          fee: feeOrTickSpacing,
          tickLower,
          tickUpper,
          amount0Desired: BigInt(token0Amount.quotient.toString()),
          amount1Desired: BigInt(token1Amount.quotient.toString()),
          amount0Min: BigInt(amount0.toString()),
          amount1Min: BigInt(amount1.toString()),
          recipient,
          deadline,
        };

  const data = getAutomanV4MintOptimalCalldata(
    amm,
    mintParams,
    swapData,
    token0FeeAmount,
    token1FeeAmount,
  );

  return {
    tx: {
      to: getAMMInfo(chainId, amm)!.apertureAutomanV4,
      from: recipient,
      data,
      value,
    },
    amounts: {
      amount0Min: amount0.toString(),
      amount1Min: amount1.toString(),
    },
  };
}

/**
 * @param tokenInAmountToSwapToToken0 equals amount0 from getIncreaseLiquidityFromTokenInSwapInfo().
 * @param tokenInAmountToSwapToToken1 equals amount1 from getIncreaseLiquidityFromTokenInSwapInfo().
 * @param tokenInFeeAmount equals (token0FeeAmount ?? 0n) + (token1FeeAmount ?? 0n) from getIncreaseLiquidityFromTokenInSwapInfo().
 */
export async function getMintFromTokenInTx(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  recipient: Address,
  pool: Pool,
  tickLower: number,
  tickUpper: number,
  tokenIn: Token,
  tokenInAmountToSwapToToken0: bigint,
  tokenInAmountToSwapToToken1: bigint,
  tokenInFeeAmount: bigint,
  swapData0: Hex,
  swapData1: Hex,
  liquidity: bigint,
  slippage: number,
  deadline: bigint,
): Promise<{
  tx: TransactionRequest;
  amounts: SimulatedAmounts;
}> {
  let value: bigint | undefined;
  if (tokenIn.isNative) {
    const tokenInAmount = CurrencyAmount.fromRawAmount(
      getNativeCurrency(chainId).wrapped,
      (
        tokenInAmountToSwapToToken0 +
        tokenInAmountToSwapToToken1 +
        tokenInFeeAmount
      ).toString(),
    );
    value = BigInt(tokenInAmount.quotient.toString());
  }
  const position = new Position({
    pool,
    liquidity: liquidity.toString(),
    tickLower,
    tickUpper,
  });
  const { amount0, amount1 } = position.mintAmountsWithSlippage(
    new Percent(Math.floor(slippage * 1e6), 1e6),
  );
  // amountsDesired used as amount of tokenIn to swap for token0 and token1 due to stack too deep compiler error.
  const mintParams: SlipStreamMintParams | UniV3MintParams =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? {
          token0: pool.token0.address as Address,
          token1: pool.token1.address as Address,
          tickSpacing: pool.tickSpacing,
          tickLower,
          tickUpper,
          amount0Desired: tokenInAmountToSwapToToken0,
          amount1Desired: tokenInAmountToSwapToToken1,
          amount0Min: BigInt(amount0.toString()),
          amount1Min: BigInt(amount1.toString()),
          recipient,
          deadline,
          sqrtPriceX96: 0n,
        }
      : {
          token0: pool.token0.address as Address,
          token1: pool.token1.address as Address,
          fee: pool.fee,
          tickLower,
          tickUpper,
          amount0Desired: tokenInAmountToSwapToToken0,
          amount1Desired: tokenInAmountToSwapToToken1,
          amount0Min: BigInt(amount0.toString()),
          amount1Min: BigInt(amount1.toString()),
          recipient,
          deadline,
        };
  const data = getAutomanMintFromTokenInCalldata(
    mintParams,
    tokenIn.address as Address,
    tokenInFeeAmount,
    swapData0,
    swapData1,
  );
  return {
    tx: {
      to: getAMMInfo(chainId, amm)!.apertureAutomanV4,
      from: recipient,
      data,
      value,
    },
    amounts: {
      amount0Min: amount0.toString(),
      amount1Min: amount1.toString(),
    },
  };
}
