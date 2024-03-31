import { AmmInfo, IUniV3Automan__factory, getChainInfoAMM } from '@/index';
import { ApertureSupportedChainId } from '@/index';
import { INonfungiblePositionManager__factory } from '@/index';
import { EventFragment } from '@ethersproject/abi';
import { Provider } from '@ethersproject/providers';
import {
  Log,
  TransactionReceipt,
  TransactionRequest,
} from '@ethersproject/providers';
import { Percent } from '@uniswap/sdk-core';
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { Pool, Position } from '@uniswap/v3-sdk';
import { BigNumber, BigNumberish } from 'ethers';

import { AutomanFragment } from '../automan';
import { getNativeCurrency } from '../currency';

export interface SimulatedAmounts {
  amount0: BigNumber;
  amount1: BigNumber;
  amount0Min: BigNumberish;
  amount1Min: BigNumberish;
}

export async function getAmountsWithSlippage(
  pool: Pool,
  tickLower: number,
  tickUpper: number,
  automanAddress: string,
  ownerAddress: string,
  functionFragment: AutomanFragment,
  data: string,
  slippageTolerance: Percent,
  provider: Provider,
): Promise<SimulatedAmounts> {
  const returnData = await provider.call({
    from: ownerAddress,
    to: automanAddress,
    data,
  });
  const { amount0, amount1, liquidity } =
    IUniV3Automan__factory.createInterface().decodeFunctionResult(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      functionFragment,
      returnData,
    ) as unknown as {
      amount0: BigNumber;
      amount1: BigNumber;
      liquidity: BigNumber;
    };
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

export function getTxToNonfungiblePositionManager(
  AmmInfo: AmmInfo,
  data: string,
  value?: BigNumberish,
) {
  return {
    to: AmmInfo.nonfungiblePositionManager,
    data,
    value,
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

/**
 * Filter logs by event.
 * @param receipt Transaction receipt.
 * @param event Event fragment.
 * @returns The filtered logs.
 */
export function filterLogsByEvent(
  receipt: TransactionReceipt,
  event: EventFragment,
): Log[] {
  const eventSig =
    INonfungiblePositionManager__factory.createInterface().getEventTopic(event);
  return receipt.logs.filter((log) => log.topics[0] === eventSig);
}

/**
 * Set or revoke Aperture UniV3 Automan contract as an operator of the signer's UniV3 positions.
 * @param chainId Chain id.
 * @param approved True if setting approval, false if revoking approval.
 * @returns The unsigned tx setting or revoking approval.
 */
export function getSetApprovalForAllTx(
  chainId: ApertureSupportedChainId,
  approved: boolean,
): TransactionRequest {
  const ammInfo = getChainInfoAMM(chainId).UNISWAP;
  return getTxToNonfungiblePositionManager(
    ammInfo,
    INonfungiblePositionManager__factory.createInterface().encodeFunctionData(
      'setApprovalForAll',
      [ammInfo.apertureAutoman!, approved],
    ),
  );
}
