// ts-node test/playground/coinGecko.ts
import { ApertureSupportedChainId } from '../../src';
import { getTokenHistoricalPricesFromCoingecko } from '../../src/price';
import {
  BASE_VIRTUAL_ADDRESS,
  getPublicClient,
  getToken,
} from '../../src/viem';

async function main() {
  const chainId = ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID;
  const client = getPublicClient(chainId);
  const token = await getToken(
    BASE_VIRTUAL_ADDRESS,
    chainId,
    client,
    await client.getBlockNumber(),
    /* showSymboleAndName= */ true,
  );
  const prices = await getTokenHistoricalPricesFromCoingecko(token, 1);
  for (const price of prices) {
    console.log(price);
  }
}

main();
