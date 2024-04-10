import {
  ApertureSupportedChainId,
  INonfungiblePositionManager__factory,
  getAMMInfo,
} from '@/index';
import { Position } from '@aperture_finance/uniswap-v3-sdk';
import { Provider } from '@ethersproject/providers';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { BigNumberish } from 'ethers';
import { Signer } from 'ethers';

/**
 * Get the token SVG URL of the specified position.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param positionId Position id.
 * @param provider Ethers provider.
 * @returns A promise that resolves to the token SVG URL.
 */
export async function getTokenSvg(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  positionId: BigNumberish,
  provider: Provider,
): Promise<URL> {
  const npm = getNPM(chainId, amm, provider);
  const uri = await npm.tokenURI(positionId);
  const json_uri = Buffer.from(
    uri.replace('data:application/json;base64,', ''),
    'base64',
  ).toString('utf-8');
  return new URL(JSON.parse(json_uri).image);
}

/**
 * Check whether the specified position is currently in range, i.e. pool price is within the position's price range.
 * @param position The position to check.
 * @returns A boolean indicating whether the position is in range.
 */
export function isPositionInRange(position: Position): boolean {
  return (
    position.pool.tickCurrent >= position.tickLower &&
    position.pool.tickCurrent < position.tickUpper
  );
}

export function getNPM(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  provider: Provider | Signer,
) {
  return INonfungiblePositionManager__factory.connect(
    getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
    provider,
  );
}
