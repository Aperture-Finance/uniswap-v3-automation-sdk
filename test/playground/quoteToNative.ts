// ts-node test/playground/quoteToNative.ts
import { ApertureSupportedChainId } from '../../src';
import { BASE_VIRTUAL_ADDRESS } from '../../src/viem';
import { fetchQuoteToNativeCurrency } from '../../src/viem/routing';

async function main() {
  const chainId = ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID;
  const rawNativeCurrencyAmount = BigInt(1e17);
  const rawTokenAmount = await fetchQuoteToNativeCurrency(
    chainId,
    BASE_VIRTUAL_ADDRESS,
    rawNativeCurrencyAmount,
  );
  console.log(rawTokenAmount);
  // prints 228975534121854602648 as expected
  // Do rawNativeCurrencyAmount / rawTokenAmount * nativeToUsd to get the price of the token in USD
  // E.g. 1e17/228975534121854602648 * 3600 = $1.57
}

main();
