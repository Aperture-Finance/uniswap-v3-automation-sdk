import {
  ApertureSupportedChainId,
  IUniV3Automan__factory,
  getAMMInfo,
} from '@/index';
import { Provider } from '@ethersproject/providers';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Signer } from 'ethers';

export function getAutomanContract(
  chainId: ApertureSupportedChainId,
  provider: Provider | Signer,
) {
  return IUniV3Automan__factory.connect(
    getAMMInfo(chainId, AutomatedMarketMakerEnum.enum.UNISWAP_V3)!
      .apertureAutoman,
    provider,
  );
}
