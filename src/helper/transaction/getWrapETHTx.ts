import {
  ApertureSupportedChainId,
  WETH__factory,
  getChainInfoAMM,
} from '@/index';
import { TransactionRequest } from '@ethersproject/providers';
import { BigNumberish } from 'ethers';

export function getWrapETHTx(
  chainId: ApertureSupportedChainId,
  amount: BigNumberish,
): TransactionRequest {
  if (chainId === ApertureSupportedChainId.CELO_MAINNET_CHAIN_ID) {
    throw new Error('CELO wrapping is not applicable');
  }
  return {
    to: getChainInfoAMM(chainId).wrappedNativeCurrency.address,
    data: WETH__factory.createInterface().encodeFunctionData('deposit'),
    value: amount,
  };
}

export function getUnwrapETHTx(
  chainId: ApertureSupportedChainId,
  amount: BigNumberish,
): TransactionRequest {
  if (chainId === ApertureSupportedChainId.CELO_MAINNET_CHAIN_ID) {
    throw new Error('CELO unwrapping is not applicable');
  }
  return {
    to: getChainInfoAMM(chainId).wrappedNativeCurrency.address,
    data: WETH__factory.createInterface().encodeFunctionData('withdraw', [
      amount,
    ]),
  };
}
