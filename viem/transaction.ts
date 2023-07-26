import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { Abi, AbiEvent } from 'abitype';
import {
  Log,
  TransactionReceipt,
  decodeEventLog,
  getAbiItem,
  getEventSelector,
} from 'viem';

import { INonfungiblePositionManager__factory } from '../typechain-types';
import { CollectableTokenAmounts } from './position';

/**
 * Filter logs by event name.
 * @param receipt Transaction receipt.
 * @param abi Contract ABI.
 * @param eventName Event name.
 * @returns The filtered logs.
 */
export function filterLogsByEvent(
  receipt: TransactionReceipt,
  abi: Abi,
  eventName: string,
): Log[] {
  const eventAbi = getAbiItem({
    abi,
    name: eventName,
  }) as AbiEvent;
  const eventSig = getEventSelector(eventAbi);
  return receipt.logs.filter((log) => log.topics[0] === eventSig);
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
  const collectLog = filterLogsByEvent(receipt, [CollectEventAbi], 'Collect');
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
    [DecreaseLiquidityEventAbi],
    'DecreaseLiquidity',
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
