import { PermitSingleData, PermitTransferFromData } from '@uniswap/permit2-sdk';
import { MethodParameters } from '@uniswap/smart-order-router';

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
