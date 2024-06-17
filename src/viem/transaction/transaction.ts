import {
  AmmInfo,
  ApertureSupportedChainId,
  Automan__factory,
  INonfungiblePositionManager__factory,
  getAMMInfo,
} from '@/index';
import { Pool, Position } from '@aperture_finance/uniswap-v3-sdk';
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { Percent } from '@uniswap/sdk-core';
import { AbiEvent } from 'abitype';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import {
  Address,
  Hex,
  Log,
  PublicClient,
  TransactionReceipt,
  TransactionRequest,
  decodeEventLog,
  decodeFunctionResult,
  encodeFunctionData,
  getAbiItem,
  hexToBigInt,
  toEventSelector,
} from 'viem';

import { RebalanceReturnType, ReinvestReturnType } from '../automan';
import { getNativeCurrency } from '../currency';
import { CollectableTokenAmounts } from '../position';
import { SimulatedAmounts } from './types';

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

export async function getAmountsWithSlippage(
  pool: Pool,
  tickLower: number,
  tickUpper: number,
  automanAddress: Address,
  ownerAddress: Address,
  functionName: 'rebalance' | 'reinvest',
  data: Hex,
  slippageTolerance: Percent,
  client: PublicClient,
): Promise<SimulatedAmounts> {
  const returnData = (
    await client.call({
      account: ownerAddress,
      to: automanAddress,
      data,
    })
  ).data!;

  const result = decodeFunctionResult({
    abi: Automan__factory.abi,
    data: returnData,
    functionName,
  });

  let amount0: bigint, amount1: bigint, liquidity: bigint;
  if (functionName === 'rebalance') {
    [, liquidity, amount0, amount1] = result as RebalanceReturnType;
  } else {
    [liquidity, amount0, amount1] = result as ReinvestReturnType;
  }

  const { amount0: amount0Min, amount1: amount1Min } = new Position({
    pool,
    liquidity: liquidity.toString(),
    tickLower,
    tickUpper,
  }).mintAmountsWithSlippage(slippageTolerance);

  return {
    amount0,
    amount1,
    amount0Min: amount0Min.toString(),
    amount1Min: amount1Min.toString(),
  };
}

/**
 * Set or revoke Aperture Automan contract as an operator of the signer's positions.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param approved True if setting approval, false if revoking approval.
 * @returns The unsigned tx setting or revoking approval.
 */
export function getSetApprovalForAllTx(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  approved: boolean,
): TransactionRequest {
  const ammInfo = getAMMInfo(chainId, amm)!;
  return getTxToNonfungiblePositionManager(
    ammInfo,
    encodeFunctionData({
      functionName: 'setApprovalForAll',
      abi: INonfungiblePositionManager__factory.abi,
      args: [ammInfo.apertureAutoman, approved],
    }),
  );
}
