import {
  ApertureSupportedChainId,
  INonfungiblePositionManager__factory,
  getChainInfo,
} from '@/index';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AbiEvent } from 'abitype';
import {
  Log,
  TransactionReceipt,
  decodeEventLog,
  getAbiItem,
  getEventSelector,
} from 'viem';

import { CollectableTokenAmounts } from './position';

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
  const eventSig = getEventSelector(eventAbi);
  return receipt.logs.filter((log) => log.topics[0] === eventSig);
}

/**
 * Parses the specified transaction receipt and extracts the position id (token id) minted by NPM within the transaction.
 * @param chainId Chain id.
 * @param txReceipt The transaction receipt to parse.
 * @param recipientAddress The receipt address to which the position is minted.
 * @returns If a position is minted to `recipientAddress`, the position id is returned. If there is more than one, the first is returned. If there are none, `undefined` is returned.
 */
export function getMintedPositionIdFromTxReceipt(
  chainId: ApertureSupportedChainId,
  txReceipt: TransactionReceipt,
  recipientAddress: string,
): bigint | undefined {
  const npmAddress =
    getChainInfo(chainId).uniswap_v3_nonfungible_position_manager.toLowerCase();
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
