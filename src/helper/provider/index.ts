import { providers } from '@0xsequence/multicall';
import { ApertureSupportedChainId, InfuraNetworkId, getChainInfo } from '@/src';
import { Logger } from '@ethersproject/logger';
import { Network } from '@ethersproject/networks';
import {
  Networkish,
  Provider,
  TransactionRequest,
  showThrottleMessage,
} from '@ethersproject/providers';
import { serialize } from '@ethersproject/transactions';
import { ConnectionInfo } from '@ethersproject/web';
import { BigNumber, ethers } from 'ethers';

const logger = new Logger('providers/5.7.2');

const defaultProjectId = '84842078b09946638c03157f83405213';

export class CustomInfuraProvider extends ethers.providers.InfuraProvider {
  static getNetwork(network: InfuraNetworkId | Networkish): Network {
    if (typeof network === 'string') {
      switch (network) {
        case 'linea':
          return {
            name: 'linea',
            chainId: 59144,
          };
        case 'base':
          return {
            name: 'base',
            chainId: 8453,
          };
        case 'avalanche':
          return {
            name: 'avalanche',
            chainId: 43114,
          };
        case 'celo':
          return {
            name: 'celo',
            chainId: 42220,
          };
        case 'bnbsmartchain':
          return {
            name: 'bnbsmartchain',
            chainId: 56,
          };
      }
    }
    return super.getNetwork(network);
  }

  static getHost(network: Network): string {
    switch (network ? network.name : 'unknown') {
      case 'mainnet':
      case 'homestead':
        return 'mainnet.infura.io';
      case 'goerli':
        return 'goerli.infura.io';
      case 'sepolia':
        return 'sepolia.infura.io';
      case 'matic':
        return 'polygon-mainnet.infura.io';
      case 'maticmum':
        return 'polygon-mumbai.infura.io';
      case 'optimism':
        return 'optimism-mainnet.infura.io';
      case 'optimism-goerli':
        return 'optimism-goerli.infura.io';
      case 'arbitrum':
        return 'arbitrum-mainnet.infura.io';
      case 'arbitrum-goerli':
        return 'arbitrum-goerli.infura.io';
      case 'linea':
        return 'linea-mainnet.infura.io';
      case 'base':
        return 'base-mainnet.infura.io';
      case 'avalanche':
        return 'avalanche-mainnet.infura.io';
      case 'celo':
        return 'celo-mainnet.infura.io';
      case 'bnbsmartchain':
        return 'bnbsmartchain-mainnet.infura.io';
      default:
        logger.throwError(
          'unsupported network',
          Logger.errors.INVALID_ARGUMENT,
          {
            argument: 'network',
            value: network,
          },
        );
        throw new Error('unsupported network');
    }
  }

  /**
   * Override the default InfuraProvider's `getUrl` function to support more networks.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getUrl(network: Network, apiKey: any): ConnectionInfo {
    const host = CustomInfuraProvider.getHost(network);
    const connection: ConnectionInfo = {
      allowGzip: true,
      url: 'https:/' + '/' + host + '/v3/' + apiKey.projectId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      throttleCallback: (attempt: number, url: string) => {
        if (apiKey.projectId === defaultProjectId) {
          showThrottleMessage();
        }
        return Promise.resolve(true);
      },
    };

    if (apiKey.projectSecret != null) {
      connection.user = '';
      connection.password = apiKey.projectSecret;
    }

    return connection;
  }
}

/**
 * Creates a public ethers provider for the specified chain id.
 * @param chainId chain id must be supported by Aperture's UniV3 Automation platform.
 * @returns A multicall-wrapped public Infura provider.
 */
export function getPublicProvider(
  chainId: number,
): providers.MulticallProvider {
  const info = getChainInfo(chainId);
  const provider = info.infura_network_id
    ? new CustomInfuraProvider(info.infura_network_id)
    : new ethers.providers.StaticJsonRpcProvider(info.rpc_url, chainId);
  return new providers.MulticallProvider(provider, {
    timeWindow: 0,
  });
}

/**
 * For a given transaction request intended for an Optimism-like L2 chain, estimate the total gas cost including both the L1 and the L2 gas cost.
 * Modelled after https://github.com/ethereum-optimism/optimism/blob/da2e8c5723ebf0045bd4f60d0aaa20d46ffe9cd0/packages/sdk/src/l2-provider.ts#L133C44-L133C44
 * @param tx The transaction request.
 * @param chainId chain id must be a supported Optimism-like L2 chain.
 * @param provider An ethers provider for the specified chain id.
 * @returns A promise that resolves to the total gas cost.
 */
export async function estimateTotalGasCostForOptimismLikeL2Tx(
  tx: TransactionRequest,
  chainId: ApertureSupportedChainId,
  provider: Provider,
): Promise<BigNumber> {
  // The following three chains are known to be supported:
  // 1. SCROLL_MAINNET_CHAIN_ID (534352);
  // 2. OPTIMISM_MAINNET_CHAIN_ID (10);
  // 3. BASE_MAINNET_CHAIN_ID (8453).
  const ovmGasPriceOracleAddress =
    chainId === ApertureSupportedChainId.SCROLL_MAINNET_CHAIN_ID
      ? '0x5300000000000000000000000000000000000002'
      : '0x420000000000000000000000000000000000000F';
  const gasPriceOracleContract = new ethers.Contract(
    ovmGasPriceOracleAddress,
    ['function getL1Fee(bytes _data) view returns (uint256)'],
    provider,
  );
  const [l1GasCost, l2GasPrice, l2GasAmount] = await Promise.all([
    gasPriceOracleContract.getL1Fee(
      serialize({
        data: tx.data,
        to: tx.to,
        gasPrice: tx.gasPrice,
        type: tx.type,
        gasLimit: tx.gasLimit,
        nonce: await getNonceForTx(provider, tx),
      }),
    ) as BigNumber,
    provider.getGasPrice(),
    provider.estimateGas(tx),
  ]);
  return l1GasCost.add(l2GasPrice.mul(l2GasAmount));
}

const getNonceForTx = async (
  provider: Provider,
  tx: TransactionRequest,
): Promise<number> => {
  if (tx.nonce !== undefined) {
    return ethers.BigNumber.from(tx.nonce).toNumber();
  } else if (tx.from !== undefined) {
    return provider.getTransactionCount(tx.from);
  } else {
    // Large nonce with lots of non-zero bytes
    return 0xffffffff;
  }
};
