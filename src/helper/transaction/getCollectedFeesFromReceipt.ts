import { INonfungiblePositionManager__factory } from '@/index';
import { TransactionReceipt } from '@ethersproject/providers';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { BigNumber } from 'ethers';

import { CollectableTokenAmounts } from '../position';
import { filterLogsByEvent } from './internal';

/**
 * Get the collected fees in the position from a transaction receipt.
 * @param receipt Transaction receipt.
 * @param token0 Token 0.
 * @param token1 Token 1.
 * @returns A promise that resolves to the collected amount of the two tokens in the position.
 */
export function getCollectedFeesFromReceipt(
  receipt: TransactionReceipt,
  token0: Token,
  token1: Token,
): CollectableTokenAmounts {
  const npmInterface = INonfungiblePositionManager__factory.createInterface();
  const collectLog = filterLogsByEvent(
    receipt,
    npmInterface.getEvent('Collect'),
  );
  let total0: BigNumber, total1: BigNumber;
  try {
    const collectEvent = npmInterface.parseLog(collectLog[0]);
    total0 = collectEvent.args.amount0;
    total1 = collectEvent.args.amount1;
  } catch (e) {
    throw new Error('Failed to decode collect event');
  }
  const decreaseLiquidityLog = filterLogsByEvent(
    receipt,
    npmInterface.getEvent('DecreaseLiquidity'),
  );
  let principal0 = BigNumber.from(0);
  let principal1 = BigNumber.from(0);
  if (decreaseLiquidityLog.length > 0) {
    try {
      const decreaseLiquidityEvent = npmInterface.parseLog(
        decreaseLiquidityLog[0],
      );
      principal0 = decreaseLiquidityEvent.args.amount0;
      principal1 = decreaseLiquidityEvent.args.amount1;
    } catch (e) {
      throw new Error('Failed to decode decrease liquidity event');
    }
  }
  return {
    token0Amount: CurrencyAmount.fromRawAmount(
      token0,
      total0.sub(principal0).toString(),
    ),
    token1Amount: CurrencyAmount.fromRawAmount(
      token1,
      total1.sub(principal1).toString(),
    ),
  };
}
