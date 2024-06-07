import { ApertureSupportedChainId, getChainInfo } from '@/index';
import { providers } from 'ethers';
import { PublicClient, createPublicClient, http } from 'viem';
import type { Transport } from 'viem';

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

export function publicClientToProvider(client: PublicClient) {
  const { chain, transport } = client;
  const network = {
    chainId: chain!.id,
    name: chain!.name,
    ensAddress: chain!.contracts?.ensRegistry?.address,
  };
  if (transport.type === 'fallback')
    return new providers.FallbackProvider(
      (transport.transports as ReturnType<Transport>[]).map(
        ({ value }) => new providers.JsonRpcProvider(value?.url, network),
      ),
    );

  return new providers.StaticJsonRpcProvider(transport.url, network);
}
