import { ApertureSupportedChainId } from '@/index';
import { Address, Hex } from 'viem';

import { buildRequest } from './aggregator';

type SelectedProtocol = {
  name: string;
  part: number;
  fromTokenAddress: string;
  toTokenAddress: string;
};

export type SwapRoute = Array<Array<Array<SelectedProtocol>>>;

/**
 * Get a quote for a swap.
 * @param chainId The chain ID.
 * @param src Contract address of a token to sell
 * @param dst Contract address of a token to buy
 * @param amount Amount of a token to sell, set in minimal divisible units
 * @param from Address of a seller, make sure that this address has approved to spend src in needed amount
 * @param slippage Limit of price slippage you are willing to accept in percentage
 */
export async function quote(
  chainId: ApertureSupportedChainId,
  src: string,
  dst: string,
  amount: string,
  from: string,
  slippage: number,
  includeProtocols?: boolean,
): Promise<{
  toAmount: string;
  tx: {
    from: Address;
    to: Address;
    data: Hex;
    value: string;
    gas: string;
    gasPrice: string;
  };
  protocols?: SwapRoute;
}> {
  if (amount === '0') {
    throw new Error('amount should greater than 0');
  }
  const swapParams = {
    src,
    dst,
    amount,
    from,
    slippage: slippage.toString(),
    disableEstimate: 'true',
    allowPartialFill: 'false',
    includeProtocols: (!!includeProtocols).toString(),
  };
  try {
    return (
      await buildRequest(chainId, 'swap', new URLSearchParams(swapParams))
    ).data;
  } catch (e) {
    console.error(e);
    throw e;
  }
}
