import {
  ApertureSupportedChainId,
  ERC20__factory,
  getChainInfoAMM,
} from '@/index';
import {
  Currency,
  CurrencyAmount,
  Ether,
  NativeCurrency,
  Token,
} from '@uniswap/sdk-core';
import { Address, PublicClient, getContract, parseUnits } from 'viem';

import { getPublicClient } from './public_client';

// The `Currency` type is defined as `Currency = NativeCurrency | Token`.
// When a liquidity pool involves ETH, i.e. WETH is one of the two tokens in the pool, the
// user can choose to provide either native ether or WETH when adding liquidity, placing a
// limit order to sell ETH, etc.
// Similar to Uniswap frontend, our frontend should allow user to pick either native ETH or
// WETH. If the former, `getNativeEther()` should be used to represent native ether; in the
// latter case, `getToken()` with WETH's address should be invoked to represent the WETH
// token, similar to all other ERC-20 tokens.

export async function getToken(
  tokenAddress: Address,
  chainId: ApertureSupportedChainId,
  publicClient?: PublicClient,
  blockNumber?: bigint,
  showSymbolAndName?: boolean,
): Promise<Token> {
  const contract = getContract({
    address: tokenAddress,
    abi: ERC20__factory.abi,
    client: publicClient ?? getPublicClient(chainId),
  });
  const opts = { blockNumber };
  if (showSymbolAndName) {
    try {
      const [decimals, symbol, name] = await Promise.all([
        contract.read.decimals(opts),
        contract.read.symbol(opts),
        contract.read.name(opts),
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
    const decimals = await contract.read.decimals(opts);
    return new Token(chainId, tokenAddress, decimals);
  }
}

class MaticNativeCurrency extends NativeCurrency {
  equals(other: Currency): boolean {
    return other.isNative && other.chainId === this.chainId;
  }

  get wrapped(): Token {
    return getChainInfoAMM(ApertureSupportedChainId.POLYGON_MAINNET_CHAIN_ID)
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
    return getChainInfoAMM(ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID)
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
    return getChainInfoAMM(ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID)
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
    return getChainInfoAMM(this.chainId).wrappedNativeCurrency;
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
    nativeCurrency = getChainInfoAMM(chainId).wrappedNativeCurrency;
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
 * is not. If `humanAmount` is invalid, an error is thrown (by `parseUnits()`).
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
    parseUnits(humanAmount, currency.decimals).toString(),
  );
}
