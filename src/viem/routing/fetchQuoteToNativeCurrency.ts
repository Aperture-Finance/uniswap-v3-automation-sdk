import {
  ApertureSupportedChainId,
  ChainSpecificRoutingAPIInfo,
  getChainInfo,
} from '@/index';
import axios from 'axios';

import {
  RoutingApiQuoteResponse,
  UnifiedRoutingApiClassicQuoteRequestBody,
  UnifiedRoutingApiQuoteResponse,
} from './types';

export async function fetchQuoteFromSpecifiedRoutingApiInfo(
  chainId: ApertureSupportedChainId,
  routingApiInfo: ChainSpecificRoutingAPIInfo,
  tokenInAddress: string,
  tokenOutAddress: string,
  rawAmount: bigint,
  type: 'exactIn' | 'exactOut',
): Promise<RoutingApiQuoteResponse> {
  if (routingApiInfo.type === 'UNIFIED_ROUTING_API') {
    const requestBody: UnifiedRoutingApiClassicQuoteRequestBody = {
      tokenIn: tokenInAddress,
      tokenInChainId: chainId,
      tokenOut: tokenOutAddress,
      tokenOutChainId: chainId,
      amount: rawAmount.toString(),
      type: type === 'exactIn' ? 'EXACT_INPUT' : 'EXACT_OUTPUT',
      configs: [
        {
          routingType: 'CLASSIC',
          protocols: ['V2', 'V3', 'MIXED'],
        },
      ],
    };
    return (
      (await axios.post(routingApiInfo.url, requestBody))
        .data as UnifiedRoutingApiQuoteResponse
    ).quote;
  } else {
    return (
      await axios.get(routingApiInfo.url, {
        params: {
          tokenInAddress: tokenInAddress,
          tokenInChainId: chainId,
          tokenOutAddress: tokenOutAddress,
          tokenOutChainId: chainId,
          amount: rawAmount.toString(),
          type: type,
        },
      })
    ).data as RoutingApiQuoteResponse;
  }
}

export async function fetchQuoteFromRoutingApi(
  chainId: ApertureSupportedChainId,
  tokenInAddress: string,
  tokenOutAddress: string,
  rawAmount: bigint,
  type: 'exactIn' | 'exactOut',
): Promise<RoutingApiQuoteResponse> {
  return fetchQuoteFromSpecifiedRoutingApiInfo(
    chainId,
    getChainInfo(chainId).routingApiInfo,
    tokenInAddress,
    tokenOutAddress,
    rawAmount,
    type,
  );
}

/**
 * Finds the best quote for swapping the specified token to the native currency.
 * @param chainId The chain id of the token.
 * @param tokenAddress The address of the token.
 * @param nativeCurrencyExactOutRawAmount The exact output amount of the native currency when requesting the quote.
 * @returns The raw amount of the input token needed in order to swap to `nativeCurrencyExactOutRawAmount` amount of the native currency.
 */
export async function fetchQuoteToNativeCurrency(
  chainId: ApertureSupportedChainId,
  tokenAddress: string,
  nativeCurrencyExactOutRawAmount: bigint,
): Promise<string> {
  const wrappedNativeCurrency = getChainInfo(chainId).wrappedNativeCurrency;
  try {
    return (
      await fetchQuoteFromRoutingApi(
        chainId,
        tokenAddress,
        wrappedNativeCurrency.address,
        nativeCurrencyExactOutRawAmount,
        'exactOut',
      )
    ).quote;
  } catch (e) {
    console.debug(
      'fail to fetchQuoteToNativeCurrency from routing api, trying to get from 1inch',
      tokenAddress,
      wrappedNativeCurrency.address,
    );

    const swapParams = {
      src: wrappedNativeCurrency.address,
      dst: tokenAddress,
      amount: nativeCurrencyExactOutRawAmount.toString(),
    };

    const { toAmount } =
      (
        await buildRequest(chainId, new URLSearchParams(swapParams)).catch(
          (e) => {
            console.error('fail to fetchQuoteToNativeCurrency from 1inch', e);
          },
        )
      )?.data ?? {};

    return toAmount;
  }
}

const ApiBaseUrl = 'https://1inch-api.aperture.finance';

function buildRequest(
  chainId: ApertureSupportedChainId,
  params: URLSearchParams,
) {
  return axios.get(`${ApiBaseUrl}/swap/v5.2/${chainId}/quote`, {
    params,
  });
}
