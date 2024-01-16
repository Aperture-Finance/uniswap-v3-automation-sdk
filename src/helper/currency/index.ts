import {
  ApertureSupportedChainId,
  ERC20__factory,
  getChainInfo,
} from '@/index';
import { Provider } from '@ethersproject/abstract-provider';
import { parseFixed } from '@ethersproject/bignumber';
import { BlockTag } from '@ethersproject/providers';
import {
  Currency,
  CurrencyAmount,
  Ether,
  NativeCurrency,
  Token,
} from '@uniswap/sdk-core';
import Big from 'big.js';

import { fetchQuoteToNativeCurrency } from '../routing';

// The `Currency` type is defined as `Currency = NativeCurrency | Token`.
// When a liquidity pool involves ETH, i.e. WETH is one of the two tokens in the pool, the
// user can choose to provide either native ether or WETH when adding liquidity, placing a
// limit order to sell ETH, etc.
// Similar to Uniswap frontend, our frontend should allow user to pick either native ETH or
// WETH. If the former, `getNativeEther()` should be used to represent native ether; in the
// latter case, `getToken()` with WETH's address should be invoked to represent the WETH
// token, similar to all other ERC-20 tokens.

export async function getToken(
  tokenAddress: string,
  chainId: ApertureSupportedChainId,
  provider: Provider,
  blockTag?: BlockTag,
  showSymbolAndName?: boolean,
): Promise<Token> {
  const contract = ERC20__factory.connect(tokenAddress, provider);
  const opts = { blockTag };
  if (showSymbolAndName) {
    try {
      const [decimals, symbol, name] = await Promise.all([
        contract.decimals(opts),
        contract.symbol(opts),
        contract.name(opts),
      ]);
      return new Token(chainId, tokenAddress, decimals, symbol, name);
    } catch (e) {
      console.log(
        `Not able to fetch token info for tokenAddress ${tokenAddress}`,
        e,
      );
      return new Token(chainId, tokenAddress, 18);
    }
  } else {
    const decimals = await contract.decimals(opts);
    return new Token(chainId, tokenAddress, decimals);
  }
}

class MaticNativeCurrency extends NativeCurrency {
  equals(other: Currency): boolean {
    return other.isNative && other.chainId === this.chainId;
  }

  get wrapped(): Token {
    return getChainInfo(ApertureSupportedChainId.POLYGON_MAINNET_CHAIN_ID)
      .wrappedNativeCurrency;
  }

  public constructor() {
    super(
      ApertureSupportedChainId.POLYGON_MAINNET_CHAIN_ID,
      18,
      'MATIC',
      'Polygon Matic',
    );
  }
}

class BscNativeCurrency extends NativeCurrency {
  equals(other: Currency): boolean {
    return other.isNative && other.chainId === this.chainId;
  }

  get wrapped(): Token {
    return getChainInfo(ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID)
      .wrappedNativeCurrency;
  }

  public constructor() {
    super(ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID, 18, 'BNB', 'BNB');
  }
}

class AvaxNativeCurrency extends NativeCurrency {
  equals(other: Currency): boolean {
    return other.isNative && other.chainId === this.chainId;
  }

  get wrapped(): Token {
    return getChainInfo(ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID)
      .wrappedNativeCurrency;
  }

  public constructor() {
    super(
      ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID,
      18,
      'AVAX',
      'AVAX',
    );
  }
}

class ExtendedEther extends Ether {
  public get wrapped(): Token {
    return getChainInfo(this.chainId).wrappedNativeCurrency;
  }

  private static _cachedExtendedEther: { [chainId: number]: NativeCurrency } =
    {};

  public static onChain(chainId: number): ExtendedEther {
    return (
      this._cachedExtendedEther[chainId] ??
      (this._cachedExtendedEther[chainId] = new ExtendedEther(chainId))
    );
  }
}

const cachedNativeCurrency: {
  [chainId: number]: NativeCurrency | Token;
} = {};
export function nativeOnChain(
  chainId: ApertureSupportedChainId,
): NativeCurrency | Token {
  if (cachedNativeCurrency[chainId]) return cachedNativeCurrency[chainId];
  let nativeCurrency: NativeCurrency | Token;
  if (chainId === ApertureSupportedChainId.POLYGON_MAINNET_CHAIN_ID) {
    nativeCurrency = new MaticNativeCurrency();
  } else if (chainId === ApertureSupportedChainId.CELO_MAINNET_CHAIN_ID) {
    nativeCurrency = getChainInfo(chainId).wrappedNativeCurrency;
  } else if (chainId === ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID) {
    nativeCurrency = new BscNativeCurrency();
  } else if (chainId === ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID) {
    nativeCurrency = new AvaxNativeCurrency();
  } else {
    nativeCurrency = ExtendedEther.onChain(chainId);
  }
  return (cachedNativeCurrency[chainId] = nativeCurrency);
}

export function getNativeCurrency(
  chainId: ApertureSupportedChainId,
): NativeCurrency {
  // `nativeOnChain()` may only return a `Token` when `chainId` represents a Celo chain.
  // Since `ApertureSupportedChainId` does not contain any Celo chains, `nativeOnChain()` will always return a `NativeCurrency`.
  return nativeOnChain(chainId) as NativeCurrency;
}

/**
 * Parses a human-readable currency amount and returns a CurrencyAmount instance internally
 * storing its raw amount. Note that `humanAmount` must be a valid decimal number with a
 * precision not exceeding the currency's 'decimals' value. For example, if a token has
 * 4 decimals, then "12.3456" and "12.3" are both valid `humanAmount` values, but "12.34567"
 * is not. If `humanAmount` is invalid, an error is thrown (by `parseFixed()`).
 * @param currency The currency.
 * @param humanAmount The human-readable amount.
 * @returns The constructed CurrencyAmount.
 */
export function getCurrencyAmount(
  currency: Currency,
  humanAmount: string,
): CurrencyAmount<Currency> {
  return CurrencyAmount.fromRawAmount(
    currency,
    parseFixed(humanAmount, currency.decimals).toString(),
  );
}

const ONE_TENTH_WETH_RAW_AMOUNT = new Big('1e17').toString();

// When determining a token's price vs the native currency, we query the routing API
// for an 'exactOut' quote swapping the specified token for the wrapped native currency.
// This map determines the exactOut raw amount of the wrapped native currency to use.
// For example, if the wrapped native currency is WETH, then a raw amount of 1e17 is 0.1 WETH.
const CHAIN_ID_TO_RAW_WRAPPED_NATIVE_CURRENCY_AMOUNT: {
  [key in ApertureSupportedChainId]: string;
} = {
  [ApertureSupportedChainId.ARBITRUM_GOERLI_TESTNET_CHAIN_ID]:
    ONE_TENTH_WETH_RAW_AMOUNT,
  [ApertureSupportedChainId.GOERLI_TESTNET_CHAIN_ID]: ONE_TENTH_WETH_RAW_AMOUNT,
  [ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID]:
    ONE_TENTH_WETH_RAW_AMOUNT,
  [ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID]:
    ONE_TENTH_WETH_RAW_AMOUNT,
  [ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID]:
    ONE_TENTH_WETH_RAW_AMOUNT,
  [ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID]: ONE_TENTH_WETH_RAW_AMOUNT,
  [ApertureSupportedChainId.MANTA_PACIFIC_MAINNET_CHAIN_ID]:
    ONE_TENTH_WETH_RAW_AMOUNT,
  [ApertureSupportedChainId.MANTA_PACIFIC_TESTNET_CHAIN_ID]:
    ONE_TENTH_WETH_RAW_AMOUNT,
  [ApertureSupportedChainId.SCROLL_MAINNET_CHAIN_ID]: ONE_TENTH_WETH_RAW_AMOUNT,
  // 0.5 BNB
  [ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID]: new Big('5e17').toString(),
  // 10 AVAX.
  [ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID]: new Big(
    '1e19',
  ).toString(),
  // 100 MATIC.
  [ApertureSupportedChainId.POLYGON_MAINNET_CHAIN_ID]: new Big(
    '1e20',
  ).toString(),
  // 100 CELO.
  [ApertureSupportedChainId.CELO_MAINNET_CHAIN_ID]: new Big('1e20').toString(),
};

/**
 * Fetches the price of the chain's native currency in terms of the specified token, e.g. the amount of ETH having the same value as 1 provided token.
 * We use Uniswap's routing service to check how much of the specified token is needed in order to swap into a certain amount of the chain's native currency.
 * The threshold is 0.1 ETH for most chains; please check `CHAIN_ID_TO_RAW_WRAPPED_NATIVE_CURRENCY_AMOUNT` for specific values.
 * @param chainId The chain ID of the token.
 * @param tokenAddress The address of the token.
 * @returns A promise that resolves to the price of the chain's native currency in terms of the specified token, or "-1" if there is not enough liquidity.
 */
export async function checkTokenLiquidityAgainstChainNativeCurrency(
  chainId: ApertureSupportedChainId,
  tokenAddress: string,
): Promise<string> {
  const wrappedNativeCurrency = getChainInfo(chainId).wrappedNativeCurrency;
  if (wrappedNativeCurrency.address === tokenAddress) return '1';
  const rawNativeCurrencyAmount =
    CHAIN_ID_TO_RAW_WRAPPED_NATIVE_CURRENCY_AMOUNT[chainId];
  const rawTokenAmount: string | undefined = await fetchQuoteToNativeCurrency(
    chainId,
    tokenAddress,
    rawNativeCurrencyAmount,
  ).catch(() => undefined);
  if (rawTokenAmount === undefined) {
    return '-1';
  }
  return new Big(rawNativeCurrencyAmount).div(rawTokenAmount).toString();
}
