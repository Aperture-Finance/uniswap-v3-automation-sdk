import { PublicClient, createPublicClient, http } from 'viem';

import { getChainInfo } from '../chain';
import { ApertureSupportedChainId } from '../interfaces';

/**
 * Creates a Viem public client for the specified chain id.
 * @param chainId chain id must be supported by Aperture's UniV3 Automation platform.
 * @returns A multicall-enabled public client.
 */
export function getPublicClient(
  chainId: ApertureSupportedChainId,
): PublicClient {
  return createPublicClient({
    batch: {
      multicall: true,
    },
    chain: getChainInfo(chainId).chain,
    transport: http(getChainInfo(chainId).rpc_url),
  });
}
