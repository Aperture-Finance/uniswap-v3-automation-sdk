import { ApertureSupportedChainId } from '@/index';
import { Provider, TransactionRequest } from '@ethersproject/providers';
import { serialize } from '@ethersproject/transactions';
import { BigNumber, ethers } from 'ethers';

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
