import { tickToBigPrice } from '@/tick';
import { SqrtPriceMath, TickMath } from '@aperture_finance/uniswap-v3-sdk';
import { Fraction, Price, Token } from '@uniswap/sdk-core';
import axios, { AxiosResponse } from 'axios';
import Big from 'big.js';
import JSBI from 'jsbi';

import { getChainInfo } from './chain';
import { ApertureSupportedChainId } from './interfaces';

// Let Big use 30 decimal places of precision since 2^96 < 10^29.
Big.DP = 30;
export const Q96 = new Big(2).pow(96);
export const Q192 = Q96.times(Q96);

// A list of two numbers representing a historical price datapoint provided by Coingecko.
// Example of a datapoint: [1679886183997, 1767.0953789568498] where the first element is the
// timestamp in milliseconds, and the second element is the price at that timestamp.
export type CoingeckoHistoricalPriceDatapoint = [number, number];

export const GECKO_TERMINAL_URL = 'https://api.geckoterminal.com/api/v2';
export const COINGECKO_PRO_URL = 'https://pro-api.coingecko.com/api/v3';
// The proxy server adds a Coingecko Pro API key to the request header, and forwards the request to pro-api.coingecko.com.
// This is intended to be used by the frontend to avoid exposing the API key.
export const COINGECKO_PROXY_URL =
  'https://coingecko-api.aperture.finance/api/v3';

/**
 * Parses the specified price string for the price of `baseToken` denominated in `quoteToken`.
 * As an example, if `baseToken` is WBTC and `quoteToken` is WETH, then the "10.23" price string represents the exchange
 * ratio of "1 WBTC = 10.23 WETH".
 * In general, `price` amount of `quoteToken` is worth the same as 1 human-unit of `baseToken`.
 * Internally, price is represented as the amount of raw `quoteToken` that is worth the same as 1 raw `baseToken`:
 * 1 raw WBTC = 10^(-8) WBTC = 10^(-8) * 10.23 WETH = 10^(-8) * 10.23 * 10^18 raw WETH = 10.23 * 10^(18-10) raw WETH.
 * Adapted from https://github.com/Uniswap/interface/blob/c2a972eb75d176f3f1a8ca24bb97cdaa4379cbd5/src/state/mint/v3/utils.ts#L12.
 * @param baseToken base token
 * @param quoteToken quote token
 * @param price What amount of `quoteToken` is worth the same as 1 baseToken
 * @returns The parsed price as an instance of Uniswap SDK Price.
 */
export function parsePrice(
  baseToken: Token,
  quoteToken: Token,
  price: string,
): Price<Token, Token> {
  // Check whether `price` is a valid string of decimal number.
  // This regex matches any number of digits optionally followed by '.' which is then followed by at least one digit.
  if (!price.match(/^\d*\.?\d+$/)) {
    throw 'Invalid price string';
  }

  const [whole, fraction] = price.split('.');
  const decimals = fraction?.length ?? 0;
  const withoutDecimals = JSBI.BigInt((whole ?? '') + (fraction ?? ''));
  return new Price(
    baseToken,
    quoteToken,
    JSBI.exponentiate(
      JSBI.BigInt(10),
      JSBI.BigInt(decimals + baseToken.decimals),
    ),
    JSBI.multiply(
      withoutDecimals,
      JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(quoteToken.decimals)),
    ),
  );
}

/**
 * Fetches the specified token's current price from Coingecko.
 * @param token The token to fetch price information for.
 * @param vsCurrencies The denominated currencies to fetch price information for. Defaults to 'usd'.
 * @param apiKey The Coingecko API key to use. Use the free api if not specified.
 * @returns The token's current USD price as a number. For example, USDC's price may be 0.999695.
 */
export async function getTokenPriceFromCoingecko(
  token: Token,
  vsCurrencies: string = 'usd',
  apiKey?: string,
): Promise<number> {
  const {
    wrappedNativeCurrency,
    coingecko_asset_platform_id,
    coinGeckoNativeCurrencySymbol,
  } = getChainInfo(token.chainId);
  if (coingecko_asset_platform_id === undefined) return 0;
  if (
    token.address === wrappedNativeCurrency.address &&
    vsCurrencies === coinGeckoNativeCurrencySymbol
  ) {
    return 1;
  }
  // Coingecko call example: https://{COINGECKO_URL}/simple/token_price/ethereum?contract_addresses=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&vs_currencies=usd
  // https://coingecko-api.aperture.finance/api/v3/simple/token_price/base?contract_addresses=0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b&vs_currencies=usd
  const priceResponse: AxiosResponse = await axios.get(
    `${apiKey ? COINGECKO_PRO_URL : COINGECKO_PROXY_URL}/simple/token_price/${coingecko_asset_platform_id}?contract_addresses=${token.address}&vs_currencies=${vsCurrencies}${apiKey ? `&x_cg_pro_api_key=${apiKey}` : ''}`,
  );
  // May throw TypeError: Cannot read properties of undefined
  return priceResponse.data[token.address.toLowerCase()][vsCurrencies];
}

/**
 * Fetches tokens' current price from Coingecko in a batch.
 * @param tokens The tokens to fetch price information for. All tokens must have the same chain id. The number of tokens cannot be too big, exact threshold unknown but 50 should be safe; otherwise only some tokens will be fetched.
 * @param vsCurrencies The denominated currencies to fetch price information for. Defaults to 'usd'.
 * @param apiKey The Coingecko API key to use. Use the free api if not specified.
 * @returns The tokens' current USD price. For example,
 * {
 *    0xbe9895146f7af43049ca1c1ae358b0541ea49704: 1783.17,
 *    0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce: 0.00000681
 * }
 */
export async function getTokenPriceListFromCoingecko(
  tokens: Token[],
  vsCurrencies: string = 'usd',
  apiKey?: string,
): Promise<{ [address: string]: number }> {
  if (tokens.length === 0) return {};
  const chainId = tokens[0].chainId;
  for (const token of tokens) {
    if (token.chainId !== chainId) {
      throw new Error('All tokens must have the same chain id');
    }
  }
  return getTokenPriceListFromCoingeckoWithAddresses(
    chainId,
    tokens.map((token) => token.address),
    vsCurrencies,
    apiKey,
  );
}

/**
 * Fetches tokens' current price from Coingecko in a batch.
 * @param chainId The chain id.
 * @param tokens The checksum addresses of tokens to fetch price information for. All tokens must have the same chain id. The number of tokens cannot be too big, exact threshold unknown but 50 should be safe; otherwise only some tokens will be fetched.
 * @param vsCurrencies The denominated currencies to fetch price information for. Defaults to 'usd'.
 * @param apiKey The Coingecko API key to use. Use the free api if not specified.
 * @returns The tokens' current USD price. For example,
 * {
 *    0xbe9895146f7af43049ca1c1ae358b0541ea49704: 1783.17,
 *    0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce: 0.00000681
 * }
 */
export async function getTokenPriceListFromCoingeckoWithAddresses(
  chainId: ApertureSupportedChainId,
  tokens: string[],
  vsCurrencies: string = 'usd',
  apiKey?: string,
): Promise<{ [address: string]: number }> {
  const { coingecko_asset_platform_id } = getChainInfo(chainId);
  if (coingecko_asset_platform_id === undefined) return {};
  const addresses = tokens.toString();
  const priceResponse: AxiosResponse = await axios.get(
    `${apiKey ? COINGECKO_PRO_URL : COINGECKO_PROXY_URL}/simple/token_price/${coingecko_asset_platform_id}?contract_addresses=${addresses}&vs_currencies=${vsCurrencies}${apiKey ? `&x_cg_pro_api_key=${apiKey}` : ''}`,
  );
  // Coingecko call example: https://{COINGECKO_URL}/simple/token_price/ethereum?contract_addresses=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&vs_currencies=usd
  return Object.keys(priceResponse.data).reduce(
    (obj: { [address: string]: number }, address: string) => {
      obj[address] = priceResponse.data[address][vsCurrencies!];
      return obj;
    },
    {},
  );
}

/**
 * Fetches tokens' current price from Gecko Terminal in a batch.
 * @param chainId The chain id.
 * @param tokens The checksum addresses of tokens to fetch price information for. All tokens must have the same chain id. The number of tokens cannot be too big, exact threshold unknown but 50 should be safe; otherwise only some tokens will be fetched.
 * @returns The tokens' current USD price. For example,
 * {
 *    0xbe9895146f7af43049ca1c1ae358b0541ea49704: 1783.17,
 *    0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce: 0.00000681
 * }
 */
export async function getTokenPriceListFromGeckoTerminalWithAddresses(
  chainId: ApertureSupportedChainId,
  tokens: string[],
): Promise<{ [address: string]: string | null }> {
  const { gecko_terminal_platform_id } = getChainInfo(chainId);
  if (gecko_terminal_platform_id === undefined) return {};
  const addresses = tokens.toString();
  const priceResponse: AxiosResponse = await axios.get(
    `${GECKO_TERMINAL_URL}/simple/networks/${gecko_terminal_platform_id}/token_price/${addresses}`,
  );
  const responseData = priceResponse.data.data.attributes.token_prices;
  // Coingecko call example: https://{GECKO_TERMINAL_URL}/simple/networks/eth/token_price/0x15D4c048F83bd7e37d49eA4C83a07267Ec4203dA,0xF433089366899D83a9f26A773D59ec7eCF30355e,0x04abEdA201850aC0124161F037Efd70c74ddC74C,0xA4EED63db85311E22dF4473f87CcfC3DaDCFA3E3,0x1985365e9f78359a9B6AD760e32412f4a445E862
  return Object.keys(responseData).reduce(
    (obj: { [address: string]: string | null }, address: string) => {
      obj[address] = responseData[address];
      return obj;
    },
    {},
  );
}

/**
 * Fetch historical price information from Coingecko.
 * @param token The token to fetch price information for.
 * @param durationDays The duration of historical price information to fetch.
 * @param vsCurrency The denominated currency to fetch price information for. Defaults to 'usd'.
 * @param apiKey The Coingecko API key to use. Use the free api if not specified.
 */
export async function getTokenHistoricalPricesFromCoingecko(
  token: Token,
  durationDays: number | 'max',
  vsCurrency: string = 'usd',
  apiKey?: string,
): Promise<CoingeckoHistoricalPriceDatapoint[]> {
  const { coingecko_asset_platform_id } = getChainInfo(token.chainId);
  if (coingecko_asset_platform_id === undefined) return [];
  const priceResponse: AxiosResponse = await axios.get(
    `${apiKey ? COINGECKO_PRO_URL : COINGECKO_PROXY_URL}/coins/${coingecko_asset_platform_id}/contract/${token.address}/market_chart?vs_currency=${vsCurrency}&days=${durationDays}${apiKey ? `&x_cg_pro_api_key=${apiKey}` : ''}`,
  );
  return priceResponse.data['prices'];
}

/**
 * For a given tick range from `tickLower` to `tickUpper`, and a given proportion of the position value that is held in
 * token0, calculate the raw price of token0 denominated in token1.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param token0ValueProportion The proportion of the position value that is held in token0, as a `Big` number between 0
 * and 1, inclusive.
 * @returns The raw price of token0 denominated in token1 for the specified tick range and token0 value proportion.
 */
export function getRawRelativePriceFromTokenValueProportion(
  tickLower: number,
  tickUpper: number,
  token0ValueProportion: Big,
): Big {
  if (tickUpper <= tickLower) {
    throw new Error(
      'Invalid tick range: tickUpper must be greater than tickLower',
    );
  }
  if (token0ValueProportion.lt(0) || token0ValueProportion.gt(1)) {
    throw new Error(
      'Invalid token0ValueProportion: must be a value between 0 and 1, inclusive',
    );
  }
  if (token0ValueProportion.eq(0)) {
    return tickToBigPrice(tickUpper);
  }
  if (token0ValueProportion.eq(1)) {
    return tickToBigPrice(tickLower);
  }
  const sqrtRatioLowerX96 = TickMath.getSqrtRatioAtTick(tickLower);
  const sqrtRatioUpperX96 = TickMath.getSqrtRatioAtTick(tickUpper);
  const L = new Big(sqrtRatioLowerX96.toString()).div(Q96);
  const U = new Big(sqrtRatioUpperX96.toString()).div(Q96);
  return U.minus(token0ValueProportion.times(U).times(2))
    .add(
      U.times(
        token0ValueProportion
          .times(L)
          .times(-4)
          .times(token0ValueProportion.sub(1))
          .add(U.times(token0ValueProportion.times(-2).add(1).pow(2))),
      ).sqrt(),
    )
    .div(token0ValueProportion.times(-2).add(2))
    .pow(2);
}

/**
 * Convert a `Fraction` object to a `Big` number.
 */
export function fractionToBig(price: Fraction): Big {
  const DP = Big.DP;
  const denominator = price.denominator.toString();
  // prevent precision loss
  Big.DP = denominator.length;
  const quotient = new Big(price.numerator.toString()).div(denominator);
  Big.DP = DP;
  return quotient;
}

/**
 * Given a price ratio of token1/token0, calculate the sqrt ratio of token1/token0.
 * @param price The price ratio of token1/token0, as a `Big` number.
 * @returns The sqrt ratio of token1/token0, as a `JSBI` number.
 */
export function priceToSqrtRatioX96(price: Big): JSBI {
  if (price.lt(0)) {
    throw new Error('Invalid price: must be non-negative');
  }
  const sqrtRatioX96 = JSBI.BigInt(price.times(Q192).sqrt().toFixed(0));
  if (JSBI.lessThan(sqrtRatioX96, TickMath.MIN_SQRT_RATIO)) {
    return TickMath.MIN_SQRT_RATIO;
  } else if (JSBI.greaterThan(sqrtRatioX96, TickMath.MAX_SQRT_RATIO)) {
    return TickMath.MAX_SQRT_RATIO;
  } else {
    return sqrtRatioX96;
  }
}

/**
 * Given a price ratio of token1/token0, calculate the proportion of the position value that is held in token0 for a
 * given tick range. Inverse of `getRawRelativePriceFromTokenValueProportion`.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param priceRatio The price ratio of token1/token0, as a `Big` number.
 * @returns The proportion of the position value that is held in token0, as a `Big` number between 0 and 1, inclusive.
 */
export function getTokenValueProportionFromPriceRatio(
  tickLower: number,
  tickUpper: number,
  priceRatio: Big,
): Big {
  if (tickUpper <= tickLower) {
    throw new Error(
      'Invalid tick range: tickUpper must be greater than tickLower',
    );
  }
  const sqrtPriceX96 = priceToSqrtRatioX96(priceRatio);
  const tick = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
  // only token0
  if (tick < tickLower) {
    return new Big(1);
  }
  // only token1
  else if (tick >= tickUpper) {
    return new Big(0);
  } else {
    const liquidity = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96));
    const amount0 = SqrtPriceMath.getAmount0Delta(
      sqrtPriceX96,
      TickMath.getSqrtRatioAtTick(tickUpper),
      liquidity,
      false,
    );
    const amount1 = SqrtPriceMath.getAmount1Delta(
      TickMath.getSqrtRatioAtTick(tickLower),
      sqrtPriceX96,
      liquidity,
      false,
    );
    const value0 = new Big(amount0.toString()).mul(priceRatio);
    return value0.div(value0.add(amount1.toString()));
  }
}
