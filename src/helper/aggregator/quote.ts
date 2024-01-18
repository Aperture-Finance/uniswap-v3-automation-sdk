import { ApertureSupportedChainId } from '@/index';

import { buildRequest } from './internal';

type SelectedProtocol = {
  name: string;
  part: number;
  fromTokenAddress: string;
  toTokenAddress: string;
};

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
    from: string;
    to: string;
    data: string;
    value: string;
    gas: string;
    gasPrice: string;
  };
  protocols?: Array<Array<Array<SelectedProtocol>>>;
}> {
  const swapParams = {
    src,
    dst,
    amount,
    from,
    slippage: slippage.toString(),
    disableEstimate: 'true',
    allowPartialFill: 'false',
    includeProtocols: includeProtocols ? 'true' : 'false',
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
