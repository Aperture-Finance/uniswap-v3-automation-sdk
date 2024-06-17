import {
  AmmInfo,
  ApertureSupportedChainId,
  INonfungiblePositionManager__factory,
  getAMMInfo,
} from '@/index';
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AbiEvent } from 'abitype';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import {
  Address,
  Hex,
  Log,
  TransactionReceipt,
  TransactionRequest,
  decodeEventLog,
  getAbiItem,
  hexToBigInt,
  toEventSelector,
} from 'viem';

import { getNativeCurrency } from '../currency';
import { CollectableTokenAmounts } from '../position';

/**
 * Filter logs by event name.
 * @param receipt Transaction receipt.
 * @param eventAbi Event ABI.
 * @returns The filtered logs.
 */
export function filterLogsByEvent(
  receipt: TransactionReceipt,
  eventAbi: AbiEvent,
): Log[] {
  const eventSig = toEventSelector(eventAbi);
  return receipt.logs.filter((log) => log.topics[0] === eventSig);
}

/**
 * Parses the specified transaction receipt and extracts the position id (token id) minted by NPM within the transaction.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param txReceipt The transaction receipt to parse.
 * @param recipientAddress The receipt address to which the position is minted.
 * @returns If a position is minted to `recipientAddress`, the position id is returned. If there is more than one, the first is returned. If there are none, `undefined` is returned.
 */
export function getMintedPositionIdFromTxReceipt(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  txReceipt: TransactionReceipt,
  recipientAddress: string,
): bigint | undefined {
  const npmAddress = getAMMInfo(
    chainId,
    amm,
  )!.nonfungiblePositionManager.toLowerCase();
  const TransferEventAbi = getAbiItem({
    abi: INonfungiblePositionManager__factory.abi,
    name: 'Transfer',
  });
  const transferLogs = filterLogsByEvent(txReceipt, TransferEventAbi);
  recipientAddress = recipientAddress.toLowerCase();
  for (const log of transferLogs) {
    if (log.address.toLowerCase() === npmAddress) {
      try {
        const transferEvent = decodeEventLog({
          abi: [TransferEventAbi],
          data: log.data,
          topics: log.topics,
        });
        if (transferEvent.args.to.toLowerCase() === recipientAddress) {
          return transferEvent.args.tokenId;
        }
      } catch (e) {}
    }
  }
  return undefined;
}

/**
 * Get the collected fees in the position from a transaction receipt.
 * @param receipt Transaction receipt.
 * @param token0 Token 0.
 * @param token1 Token 1.
 * @returns The collected fees.
 */
export function getCollectedFeesFromReceipt(
  receipt: TransactionReceipt,
  token0: Token,
  token1: Token,
): CollectableTokenAmounts {
  const CollectEventAbi = getAbiItem({
    abi: INonfungiblePositionManager__factory.abi,
    name: 'Collect',
  });
  const collectLog = filterLogsByEvent(receipt, CollectEventAbi);
  let total0: bigint, total1: bigint;
  try {
    const collectEvent = decodeEventLog({
      abi: [CollectEventAbi],
      data: collectLog[0].data,
      topics: collectLog[0].topics,
    });
    total0 = collectEvent.args.amount0;
    total1 = collectEvent.args.amount1;
  } catch (e) {
    throw new Error('Failed to decode collect event');
  }
  const DecreaseLiquidityEventAbi = getAbiItem({
    abi: INonfungiblePositionManager__factory.abi,
    name: 'DecreaseLiquidity',
  });
  const decreaseLiquidityLog = filterLogsByEvent(
    receipt,
    DecreaseLiquidityEventAbi,
  );
  let principal0 = BigInt(0);
  let principal1 = BigInt(0);
  if (decreaseLiquidityLog.length > 0) {
    try {
      const decreaseLiquidityEvent = decodeEventLog({
        abi: [DecreaseLiquidityEventAbi],
        data: decreaseLiquidityLog[0].data,
        topics: decreaseLiquidityLog[0].topics,
      });
      principal0 = decreaseLiquidityEvent.args.amount0;
      principal1 = decreaseLiquidityEvent.args.amount1;
    } catch (e) {
      throw new Error('Failed to decode decrease liquidity event');
    }
  }
  return {
    token0Amount: CurrencyAmount.fromRawAmount(
      token0,
      (total0 - principal0).toString(),
    ),
    token1Amount: CurrencyAmount.fromRawAmount(
      token1,
      (total1 - principal1).toString(),
    ),
  };
}

export function convertCollectableTokenAmountToExpectedCurrencyOwed(
  collectableTokenAmount: {
    token0Amount: CurrencyAmount<Token>;
    token1Amount: CurrencyAmount<Token>;
  },
  chainId: ApertureSupportedChainId,
  token0: Token,
  token1: Token,
  receiveNativeEtherIfApplicable?: boolean,
): {
  expectedCurrencyOwed0: CurrencyAmount<Currency>;
  expectedCurrencyOwed1: CurrencyAmount<Currency>;
} {
  let expectedCurrencyOwed0: CurrencyAmount<Currency> =
    collectableTokenAmount.token0Amount;
  let expectedCurrencyOwed1: CurrencyAmount<Currency> =
    collectableTokenAmount.token1Amount;
  if (receiveNativeEtherIfApplicable) {
    const nativeEther = getNativeCurrency(chainId);
    const weth = nativeEther.wrapped;
    if (weth.equals(token0)) {
      expectedCurrencyOwed0 = CurrencyAmount.fromRawAmount(
        nativeEther,
        collectableTokenAmount.token0Amount.quotient,
      );
    } else if (weth.equals(token1)) {
      expectedCurrencyOwed1 = CurrencyAmount.fromRawAmount(
        nativeEther,
        collectableTokenAmount.token1Amount.quotient,
      );
    }
  }
  return {
    expectedCurrencyOwed0,
    expectedCurrencyOwed1,
  };
}

export function getTxToNonfungiblePositionManager(
  AmmInfo: AmmInfo,
  data: string,
  value?: string,
  from?: string,
): TransactionRequest {
  from = from ?? '0x';
  return {
    from: from as Address,
    to: AmmInfo.nonfungiblePositionManager,
    data: data as Hex,
    ...(value && {
      value: hexToBigInt(value as Hex),
    }),
  };
}
