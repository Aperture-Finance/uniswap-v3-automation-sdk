import {
  ApertureSupportedChainId,
  ChainSpecificRoutingAPIInfo,
  getChainInfo,
} from '@/index';
import { PermitSingleData, PermitTransferFromData } from '@uniswap/permit2-sdk';
import { MethodParameters } from '@uniswap/smart-order-router';
import axios from 'axios';
import { BigNumber, BigNumberish } from 'ethers';

export type TokenInRoute = {
  address: string;
  chainId: number;
  symbol: string;
  decimals: string;
};

export type V3PoolInRoute = {
  type: 'v3-pool';
  address: string;
  tokenIn: TokenInRoute;
  tokenOut: TokenInRoute;
  sqrtRatioX96: string;
  liquidity: string;
  tickCurrent: string;
  fee: string;
  amountIn?: string;
  amountOut?: string;
};

export type V2Reserve = {
  token: TokenInRoute;
  quotient: string;
};

export type V2PoolInRoute = {
  type: 'v2-pool';
  address: string;
  tokenIn: TokenInRoute;
  tokenOut: TokenInRoute;
  reserve0: V2Reserve;
  reserve1: V2Reserve;
  amountIn?: string;
  amountOut?: string;
};

export type RoutingApiQuoteResponse = {
  quoteId: string;
  amount: string;
  amountDecimals: string;
  quote: string;
  quoteDecimals: string;
  quoteGasAdjusted: string;
  quoteGasAdjustedDecimals: string;
  gasUseEstimate: string;
  gasUseEstimateQuote: string;
  gasUseEstimateQuoteDecimals: string;
  gasUseEstimateUSD: string;
  simulationError?: boolean;
  simulationStatus: string;
  gasPriceWei: string;
  blockNumber: string;
  route: Array<(V3PoolInRoute | V2PoolInRoute)[]>;
  routeString: string;
  methodParameters?: MethodParameters;
};

export type UnifiedRoutingApiQuoteResponse = {
  routing: string;
  quote: RoutingApiQuoteResponse & {
    requestId: string;
    permitData?: PermitSingleData | PermitTransferFromData;
    tradeType: string;
    slippage: number;
  };
};

export type ClassicRoutingConfig = {
  protocols?: ('V2' | 'V3' | 'MIXED')[];
  gasPriceWei?: string;
  simulateFromAddress?: string;
  permitSignature?: string;
  permitNonce?: string;
  permitExpiration?: string;
  permitAmount?: string;
  permitSigDeadline?: string;
  enableUniversalRouter?: boolean;
  recipient?: string;
  algorithm?: string;
  deadline?: number;
  minSplits?: number;
  forceCrossProtocol?: boolean;
  forceMixedRoutes?: boolean;
  routingType: 'CLASSIC';
};

export type UnifiedRoutingApiClassicQuoteRequestBody = {
  tokenInChainId: number;
  tokenOutChainId: number;
  tokenIn: string;
  tokenOut: string;
  amount: string;
  type: 'EXACT_INPUT' | 'EXACT_OUTPUT';
  configs: ClassicRoutingConfig[];
  slippageTolerance?: string;
  swapper?: string;
  useUniswapX?: boolean;
};

export async function fetchQuoteFromSpecifiedRoutingApiInfo(
  chainId: ApertureSupportedChainId,
  routingApiInfo: ChainSpecificRoutingAPIInfo,
  tokenInAddress: string,
  tokenOutAddress: string,
  rawAmount: BigNumberish,
  type: 'exactIn' | 'exactOut',
): Promise<RoutingApiQuoteResponse> {
  if (routingApiInfo.type === 'UNIFIED_ROUTING_API') {
    const requestBody: UnifiedRoutingApiClassicQuoteRequestBody = {
      tokenIn: tokenInAddress,
      tokenInChainId: chainId,
      tokenOut: tokenOutAddress,
      tokenOutChainId: chainId,
      amount: BigNumber.from(rawAmount).toString(),
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
          amount: BigNumber.from(rawAmount).toString(),
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
  rawAmount: BigNumberish,
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
  nativeCurrencyExactOutRawAmount: BigNumberish,
): Promise<string> {
  return (
    await fetchQuoteFromRoutingApi(
      chainId,
      tokenAddress,
      getChainInfo(chainId).wrappedNativeCurrency.address,
      nativeCurrencyExactOutRawAmount,
      'exactOut',
    )
  ).quote;
}
