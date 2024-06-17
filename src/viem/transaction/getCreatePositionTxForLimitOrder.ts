import {
  ApertureSupportedChainId,
  getAMMInfo,
  priceToClosestTickSafe,
  tickToLimitOrderRange,
} from '@/index';
import {
  FeeAmount,
  NonfungiblePositionManager,
  Position,
} from '@aperture_finance/uniswap-v3-sdk';
import {
  Currency,
  CurrencyAmount,
  Percent,
  Price,
  Token,
} from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import JSBI from 'jsbi';
import {
  Address,
  Hex,
  PublicClient,
  TransactionRequest,
  hexToBigInt,
} from 'viem';

import { getNativeCurrency } from '../currency';
import { getPool } from '../pool';

/**
 * Generates an unsigned transaction that creates a position for the specified limit order.
 * The position has single-sided liquidity entirely concentrated on the input asset, and will
 * be closed by automation when the entire liquidity moves to the output asset.
 * The initial single-sided liquidity will be provided over the smallest possible price range where
 * the higher end is `outerLimitPrice` which is expected to be aligned to a usable tick already.
 * Note that if the user wishes to sell ETH, then `limitPrice.baseCurrency` must be the WETH token,
 * but `inputCurrencyAmount.currency` should be either native ether or WETH token depending on which
 * the user chooses to provide.
 *
 * @param recipient The recipient address (connected wallet address).
 * @param outerLimitPrice The outer limit price where the base currency is the input asset (what the user wants to sell)
 * and the quote currency is the output asset (what the user wants to buy).
 * @param inputCurrencyAmount The amount of input asset that the user wants to sell.
 * @param poolFee The fee tier of the liquidity pool that the limit order position should be created on.
 * @param deadlineEpochSeconds Transaction deadline in seconds since UNIX epoch.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param client Viem public client.
 * @param widthMultiplier The width multiplier of the tick range in terms of tick spacing.
 * @returns The unsigned transaction that creates such a position.
 */
export async function getCreatePositionTxForLimitOrder(
  recipient: Address,
  outerLimitPrice: Price<Token, Token>,
  inputCurrencyAmount: CurrencyAmount<Currency>,
  poolFee: FeeAmount,
  deadlineEpochSeconds: bigint,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  client: PublicClient,
  widthMultiplier = 1,
): Promise<TransactionRequest> {
  if (
    inputCurrencyAmount.currency.isNative &&
    !getNativeCurrency(chainId).wrapped.equals(outerLimitPrice.baseCurrency)
  ) {
    throw 'Input currency is native ether but base currency is not WETH';
  }
  const { tickLower, tickUpper } = tickToLimitOrderRange(
    priceToClosestTickSafe(outerLimitPrice),
    poolFee,
    widthMultiplier,
  );
  const zeroToOne = outerLimitPrice.baseCurrency.sortsBefore(
    outerLimitPrice.quoteCurrency,
  );
  const pool = await getPool(
    outerLimitPrice.baseCurrency,
    outerLimitPrice.quoteCurrency,
    poolFee,
    chainId,
    amm,
    client,
  );
  const position = zeroToOne
    ? Position.fromAmount0({
        pool,
        tickLower,
        tickUpper,
        amount0: inputCurrencyAmount.quotient,
        useFullPrecision: false,
      })
    : Position.fromAmount1({
        pool,
        tickLower,
        tickUpper,
        amount1: inputCurrencyAmount.quotient,
      });
  const { amount0, amount1 } = position.mintAmounts;
  if (
    (zeroToOne && JSBI.greaterThan(amount1, JSBI.BigInt(0))) ||
    (!zeroToOne && JSBI.greaterThan(amount0, JSBI.BigInt(0)))
  ) {
    throw 'Specified limit price not applicable';
  }
  const { calldata, value } = NonfungiblePositionManager.addCallParameters(
    position,
    {
      slippageTolerance: new Percent(0),
      deadline: deadlineEpochSeconds.toString(),
      useNative: inputCurrencyAmount.currency.isNative
        ? getNativeCurrency(chainId)
        : undefined,
      recipient,
    },
  );

  return {
    from: recipient,
    to: getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
    data: calldata as Hex,
    value: hexToBigInt(value as Hex),
  };
}
