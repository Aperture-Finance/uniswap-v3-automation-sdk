import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import axios from 'axios';
import { Address, Hex } from 'viem';

import { encodeOptimalSwapData } from '../automan';
import { limiter } from './common';
import { ISolver } from './types';
import { SwapRoute } from './types';

const ApiBaseUrl = 'https://1inch-api.aperture.finance';
const headers = {
  Accept: 'application/json',
};

export async function buildRequest(
  chainId: ApertureSupportedChainId,
  methodName: string,
  params: object,
) {
  return limiter.schedule(() =>
    axios.get(apiRequestUrl(chainId, methodName), {
      headers,
      params,
    }),
  );
}

function apiRequestUrl(chainId: ApertureSupportedChainId, methodName: string) {
  return new URL(`/swap/v5.2/${chainId}/${methodName}`, ApiBaseUrl).toString();
}

export async function get1InchApproveTarget(
  chainId: ApertureSupportedChainId,
): Promise<Address> {
  try {
    return (await buildRequest(chainId, 'approve/spender', {})).data.address;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export const get1InchSolver = (): ISolver => {
  return {
    solve: async (props) => {
      const {
        chainId,
        amm,
        token0,
        token1,
        feeOrTickSpacing,
        tickLower,
        tickUpper,
        slippage,
        poolAmountIn,
        zeroForOne,
      } = props;

      const { optimalSwapRouter } = getAMMInfo(chainId, amm)!;
      if (!optimalSwapRouter) {
        throw new Error('Chain or AMM not supported');
      }

      const { toAmount, tx, protocols } = await get1InchQuote(
        chainId,
        zeroForOne ? token0 : token1,
        zeroForOne ? token1 : token0,
        poolAmountIn.toString(),
        optimalSwapRouter,
        slippage * 100,
        true,
      );

      const approveTarget = await get1InchApproveTarget(chainId);
      return {
        toAmount: BigInt(toAmount),
        swapData: encodeOptimalSwapData(
          chainId,
          amm,
          token0,
          token1,
          feeOrTickSpacing,
          tickLower,
          tickUpper,
          zeroForOne,
          approveTarget,
          tx.to,
          tx.data,
        ),
        swapRoute: protocols,
      };
    },
  };
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
export async function get1InchQuote(
  chainId: ApertureSupportedChainId,
  src: string,
  dst: string,
  amount: string,
  from: string,
  slippage: number,
  includeProtocols?: boolean,
  methodName: string = 'swap',
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
      await buildRequest(chainId, methodName, new URLSearchParams(swapParams))
    ).data;
  } catch (e) {
    console.error(e);
    throw e;
  }
}
