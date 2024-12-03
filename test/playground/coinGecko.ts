// ts-node test/playground/coinGecko.ts
import { Address } from 'viem';

import { ApertureSupportedChainId } from '../../src';
import { getTokenHistoricalPricesFromCoingecko } from '../../src/price';
import { getPublicClient, getToken } from '../../src/viem';

async function main() {
  const chainId = ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID;
  const client = getPublicClient(chainId);
  const token = await getToken(
    '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b' as Address,
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
