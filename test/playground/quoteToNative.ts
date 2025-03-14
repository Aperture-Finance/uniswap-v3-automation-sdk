// ts-node test/playground/quoteToNative.ts
import {
  ApertureSupportedChainId,
  ConsoleLogger,
  IOCKEY_LOGGER,
  ioc,
} from '../../src';
import { getOkxQuote } from '../../src/viem';
import { fetchQuoteToNativeCurrency } from '../../src/viem/routing';

async function main() {
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);
  console.log(
    await getOkxQuote(
      ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID,
      '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
      '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
      BigInt(1e17).toString(),
    ),
  );
  const chainId = ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID;
  const rawNativeCurrencyAmount = BigInt(1e17);
  const rawTokenAmount = await fetchQuoteToNativeCurrency(
    chainId,
    '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b', // BASE_VIRTUAL_ADDRESS
    rawNativeCurrencyAmount,
  );
  console.log(rawTokenAmount);
  // prints 228975534121854602648 as expected
  // Do rawNativeCurrencyAmount / rawTokenAmount * nativeToUsd to get the price of the token in USD
  // E.g. 1e17/228975534121854602648 * 3600 = $1.57
}

main();
