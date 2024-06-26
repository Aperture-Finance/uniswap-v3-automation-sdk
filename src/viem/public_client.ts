import { ApertureSupportedChainId, getChainInfo } from '@/index';
import { providers } from 'ethers';
import {
  PublicClient,
  TransactionRequest,
  TransactionSerializable,
  Transport,
  createPublicClient,
  http,
  serializeTransaction,
} from 'viem';
import { publicActionsL2 } from 'viem/op-stack';

/**
 * Creates a Viem public client for the specified chain id.
 * @param chainId chain id must be supported by Aperture's UniV3 Automation platform.
 * @param rpc_url rpc_url.
 * @returns A multicall-enabled public client.
 */
export function getPublicClient(
  chainId: ApertureSupportedChainId,
  rpc_url?: string,
): PublicClient {
  return createPublicClient({
    batch: {
      multicall: true,
    },
    chain: getChainInfo(chainId).chain,
    transport: http(rpc_url ?? getChainInfo(chainId).rpc_url),
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

// seems not support manta
export async function estimateTotalFee(
  tx: TransactionRequest,
  client: PublicClient,
) {
  const l2Client = client.extend(publicActionsL2());
  const chainId = await client.getChainId();
  const gasPriceOracleAddress =
    chainId === ApertureSupportedChainId.SCROLL_MAINNET_CHAIN_ID
      ? '0x5300000000000000000000000000000000000002'
      : '0x420000000000000000000000000000000000000F';

  const { from, to, value, data } = tx;

  return l2Client.estimateTotalFee({
    account: from,
    to,
    value,
    data,
    gasPriceOracleAddress,
    chain: client.chain,
  });
}

/**
 * For a given transaction request intended for an Optimism-like L2 chain, estimate the total gas cost including both the L1 and the L2 gas cost.
 * Modelled after https://github.com/ethereum-optimism/optimism/blob/da2e8c5723ebf0045bd4f60d0aaa20d46ffe9cd0/packages/sdk/src/l2-provider.ts#L133C44-L133C44
 * @param tx The transaction request.
 * @param chainId chain id must be a supported Optimism-like L2 chain.
 * @param client A Viem public client for the specified chain id.
 * @returns A promise that resolves to the total gas cost.
 */
export async function estimateTotalGasCostForOptimismLikeL2Tx(
  tx: TransactionRequest,
  chainId: ApertureSupportedChainId,
  client: PublicClient,
): Promise<{
  totalGasCost: bigint;
  l2GasPrice: bigint;
  l2GasAmount: bigint;
}> {
  // The following three chains are known to be supported:
  // 1. SCROLL_MAINNET_CHAIN_ID (534352);
  // 2. OPTIMISM_MAINNET_CHAIN_ID (10);
  // 3. BASE_MAINNET_CHAIN_ID (8453).
  const ovmGasPriceOracleAddress =
    chainId === ApertureSupportedChainId.SCROLL_MAINNET_CHAIN_ID
      ? '0x5300000000000000000000000000000000000002'
      : '0x420000000000000000000000000000000000000F';

  const serializableTx: TransactionSerializable = {
    data: tx.data,
    to: tx.to,
    value: tx.value,
    type: 'legacy',
    nonce: await getNonceForTx(client, tx),
  };

  const [l1GasCost, l2GasPrice, l2GasAmount] = await Promise.all([
    client.readContract({
      address: ovmGasPriceOracleAddress,
      abi: [
        {
          inputs: [{ internalType: 'bytes', name: '_data', type: 'bytes' }],
          name: 'getL1Fee',
          outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'getL1Fee',
      args: [serializeTransaction(serializableTx)],
    }),
    client.getGasPrice(),
    client.estimateGas({
      ...tx,
      account: tx.from,
    }),
  ]);

  return {
    totalGasCost: l1GasCost + l2GasPrice * l2GasAmount,
    l2GasPrice,
    l2GasAmount,
  };
}

const getNonceForTx = async (
  client: PublicClient,
  tx: TransactionRequest,
): Promise<number> => {
  if (tx.nonce !== undefined) {
    return tx.nonce;
  } else if (tx.from !== undefined) {
    return client.getTransactionCount({
      address: tx.from,
    });
  } else {
    // Large nonce with lots of non-zero bytes
    return 0xffffffff;
  }
};
