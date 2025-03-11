import {
  ApertureSupportedChainId,
  ChainSpecificRoutingAPIInfo,
  getChainInfo,
} from '@/index';
import axios from 'axios';

import { getOkxQuote } from '../solver';
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
      'fail to fetchQuoteToNativeCurrency from routing api, trying to get from okx',
      tokenAddress,
      wrappedNativeCurrency.address,
    );

    return (
      // OKX quote doesn't have an option to swap exactOut,
      // so we swap the native currency to the token instead.
      await getOkxQuote(
        chainId,
        /* src= */ wrappedNativeCurrency.address,
        /* dst= */ tokenAddress,
        nativeCurrencyExactOutRawAmount.toString(),
      )
    ).toAmount;
  }
}
