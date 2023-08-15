import { PublicClient, createPublicClient, http } from 'viem';

import { ViemSupportedChainId, getChainInfo } from './chain';

/**
 * Creates a Viem public client for the specified chain id.
 * @param chainId chain id must be supported by Aperture's UniV3 Automation platform.
 * @returns A multicall-enabled public client.
 */
export function getPublicClient(chainId: ViemSupportedChainId): PublicClient {
  return createPublicClient({
    batch: {
      multicall: true,
    },
    chain: getChainInfo(chainId).chain,
    transport: http(),
  });
}
