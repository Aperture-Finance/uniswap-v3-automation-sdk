import {
  ApertureSupportedChainId,
  IAutoman__factory,
  getAMMInfo,
} from '@/index';
import { Provider } from '@ethersproject/providers';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Signer } from 'ethers';

export function getAutomanContract(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  provider: Provider | Signer,
) {
  return IAutoman__factory.connect(
    getAMMInfo(chainId, amm)!.apertureAutoman,
    provider,
  );
}
