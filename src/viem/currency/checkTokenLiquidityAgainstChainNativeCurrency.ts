import { ApertureSupportedChainId, getChainInfo } from '@/index';

import { fetchQuoteToNativeCurrency } from '../routing';

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
): Promise<bigint> {
  const wrappedNativeCurrency = getChainInfo(chainId).wrappedNativeCurrency;
  if (wrappedNativeCurrency.address === tokenAddress) return 1n;
  const rawNativeCurrencyAmount =
    CHAIN_ID_TO_RAW_WRAPPED_NATIVE_CURRENCY_AMOUNT[chainId];
  const rawTokenAmount: string | undefined = await fetchQuoteToNativeCurrency(
    chainId,
    tokenAddress,
    rawNativeCurrencyAmount,
  ).catch(() => undefined);
  if (rawTokenAmount === undefined) {
    return -1n;
  }
  return rawNativeCurrencyAmount / BigInt(rawTokenAmount);
}

const ONE_TENTH_WETH_RAW_AMOUNT = BigInt(1e17);

// When determining a token's price vs the native currency, we query the routing API
// for an 'exactOut' quote swapping the specified token for the wrapped native currency.
// This map determines the exactOut raw amount of the wrapped native currency to use.
// For example, if the wrapped native currency is WETH, then a raw amount of 1e17 is 0.1 WETH.
const CHAIN_ID_TO_RAW_WRAPPED_NATIVE_CURRENCY_AMOUNT: {
  [key in ApertureSupportedChainId]: bigint;
} = {
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
  [ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID]: BigInt(5e17),
  // 10 AVAX.
  [ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID]: BigInt(1e19),
  // 100 MATIC.
  [ApertureSupportedChainId.POLYGON_MAINNET_CHAIN_ID]: BigInt(1e20),
};
