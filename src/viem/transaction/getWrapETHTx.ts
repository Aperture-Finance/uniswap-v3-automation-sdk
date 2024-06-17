import { ApertureSupportedChainId, WETH__factory, getChainInfo } from '@/index';
import { Address, TransactionRequest, encodeFunctionData } from 'viem';

export function getWrapETHTx(
  chainId: ApertureSupportedChainId,
  amount: bigint,
): TransactionRequest {
  return {
    from: '0x',
    to: getChainInfo(chainId).wrappedNativeCurrency.address as Address,
    data: encodeFunctionData({
      functionName: 'deposit',
      abi: WETH__factory.abi,
    }),
    value: amount,
  };
}

export function getUnwrapETHTx(
  chainId: ApertureSupportedChainId,
  amount: bigint,
): TransactionRequest {
  return {
    from: '0x',
    to: getChainInfo(chainId).wrappedNativeCurrency.address as Address,
    data: encodeFunctionData({
      functionName: 'withdraw',
      abi: WETH__factory.abi,
      args: [amount] as const,
    }),
  };
}
