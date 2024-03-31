import {
  ApertureSupportedChainId,
  IUniV3Automan__factory,
  getChainInfoAMM,
} from '@/index';
import { Provider } from '@ethersproject/providers';
import { Signer } from 'ethers';

export function getAutomanContract(
  chainId: ApertureSupportedChainId,
  provider: Provider | Signer,
) {
  return IUniV3Automan__factory.connect(
    getChainInfoAMM(chainId).ammToInfo.get('UNISWAP')?.apertureAutoman!,
    provider,
  );
}
