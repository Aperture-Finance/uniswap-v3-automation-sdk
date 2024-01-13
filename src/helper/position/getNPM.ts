import {
  ApertureSupportedChainId,
  INonfungiblePositionManager__factory,
  getChainInfo,
} from '@/index';
import { Provider } from '@ethersproject/providers';
import { Signer } from 'ethers';

export function getNPM(
  chainId: ApertureSupportedChainId,
  provider: Provider | Signer,
) {
  return INonfungiblePositionManager__factory.connect(
    getChainInfo(chainId).uniswap_v3_nonfungible_position_manager,
    provider,
  );
}
