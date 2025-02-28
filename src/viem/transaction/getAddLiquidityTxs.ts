import {
  ApertureSupportedChainId,
  getAMMInfo,
  priceToClosestTickSafe,
  tickToLimitOrderRange,
} from '@/index';
import {
  FeeAmount,
  IncreaseOptions,
  MintOptions,
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
import { Address, PublicClient, TransactionRequest } from 'viem';

import { getNativeCurrency } from '../currency';
import { getPool } from '../pool';
import { PositionDetails } from '../position';
import { getTxToNonfungiblePositionManager } from './transaction';

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

  return getTxToNonfungiblePositionManager(
    getAMMInfo(chainId, amm)!,
    calldata,
    value,
    recipient,
  );
}

/**
 * Generates an unsigned transaction that creates a position as specified.
 * @param position The position to create.
 * @param options Options.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param provider Ethers provider.
 * @returns The unsigned tx.
 */
export async function getCreatePositionTx(
  position: Position,
  options: Omit<MintOptions, 'createPool'>,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  client: PublicClient,
): Promise<TransactionRequest> {
  let createPool = false;
  // We do not support `createPool` for SlipStream AMM.
  // SlipStream create position tx must be sent with the pool already created.
  if (amm !== AutomatedMarketMakerEnum.enum.SLIPSTREAM) {
    try {
      await getPool(
        position.pool.token0,
        position.pool.token1,
        position.pool.fee,
        chainId,
        amm,
        client,
      );
    } catch (e) {
      createPool = true;
    }
  }
  const { calldata, value } = NonfungiblePositionManager.addCallParameters(
    position,
    {
      ...options,
      createPool,
    },
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM,
  );

  return getTxToNonfungiblePositionManager(
    getAMMInfo(chainId, amm)!,
    calldata,
    value,
    options.recipient,
  );
}

/**
 * Generates an unsigned transaction that adds liquidity to an existing position.
 * Note that if the position involves ETH and the user wishes to provide native ether instead of WETH, then
 * `increaseLiquidityOptions.useNative` should be set to `getNativeEther(chainId)`.
 * @param increaseLiquidityOptions Increase liquidity options.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param client Viem public client.
 * @param liquidityToAdd The amount of liquidity to add to the existing position.
 * @param position Uniswap SDK Position object for the specified position (optional); if undefined, one will be created.
 * @returns The unsigned tx.
 */
export async function getAddLiquidityTx(
  increaseLiquidityOptions: IncreaseOptions,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  from: Address,
  client: PublicClient,
  liquidityToAdd: string,
  position?: Position,
): Promise<TransactionRequest> {
  if (position === undefined) {
    ({ position } = await PositionDetails.fromPositionId(
      chainId,
      amm,
      BigInt(increaseLiquidityOptions.tokenId.toString()),
      client,
    ));
  }
  // Same as `position` except that the liquidity field represents the amount of liquidity to add to the existing `position`.
  const incrementalPosition = new Position({
    pool: position.pool,
    liquidity: liquidityToAdd,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
  });
  const { calldata, value } = NonfungiblePositionManager.addCallParameters(
    incrementalPosition,
    increaseLiquidityOptions,
  );
  return getTxToNonfungiblePositionManager(
    getAMMInfo(chainId, amm)!,
    calldata,
    value,
    from,
  );
}
