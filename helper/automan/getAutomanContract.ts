import {
  ApertureSupportedChainId,
  IUniV3Automan__factory,
  getChainInfo,
} from '@/index';
import { Provider } from '@ethersproject/providers';
import { Signer } from 'ethers';

export function getAutomanContract(
  chainId: ApertureSupportedChainId,
  provider: Provider | Signer,
) {
  return IUniV3Automan__factory.connect(
    getChainInfo(chainId).aperture_uniswap_v3_automan,
    provider,
  );
}
