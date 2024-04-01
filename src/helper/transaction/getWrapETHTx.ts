import { ApertureSupportedChainId, WETH__factory, getChainInfo } from '@/index';
import { TransactionRequest } from '@ethersproject/providers';
import { BigNumberish } from 'ethers';

export function getWrapETHTx(
  chainId: ApertureSupportedChainId,
  amount: BigNumberish,
): TransactionRequest {
  return {
    to: getChainInfo(chainId).wrappedNativeCurrency.address,
    data: WETH__factory.createInterface().encodeFunctionData('deposit'),
    value: amount,
  };
}

export function getUnwrapETHTx(
  chainId: ApertureSupportedChainId,
  amount: BigNumberish,
): TransactionRequest {
  return {
    to: getChainInfo(chainId).wrappedNativeCurrency.address,
    data: WETH__factory.createInterface().encodeFunctionData('withdraw', [
      amount,
    ]),
  };
}
