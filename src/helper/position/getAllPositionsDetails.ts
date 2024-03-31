import { ApertureSupportedChainId, getChainInfoAMM } from '@/index';
import { Provider } from '@ethersproject/providers';
import { EphemeralAllPositionsByOwner__factory } from 'aperture-lens';
import { PositionStateStructOutput } from 'aperture-lens/dist/typechain/contracts/EphemeralGetPosition';

import { PositionDetails } from './PositionDetails';

/**
 * Get the state and pool for all positions of the specified owner by deploying an ephemeral contract via `eth_call`.
 * Each position consumes about 200k gas, so this method may fail if the number of positions exceeds 1500 assuming the
 * provider gas limit is 300m.
 * @param owner The owner.
 * @param chainId Chain id.
 * @param provider Ethers provider.
 * @returns A map where each key is a position id and its associated value is PositionDetails of that position.
 */
export async function getAllPositionsDetails(
  owner: string,
  chainId: ApertureSupportedChainId,
  provider: Provider,
): Promise<Map<string, PositionDetails>> {
  const returnData = await provider.call(
    new EphemeralAllPositionsByOwner__factory().getDeployTransaction(
      getChainInfoAMM(chainId).UNISWAP.nonfungiblePositionManager,
      owner,
    ),
  );
  const iface = EphemeralAllPositionsByOwner__factory.createInterface();
  const positions = iface.decodeFunctionResult(
    'allPositions',
    returnData,
  )[0] as PositionStateStructOutput[];
  return new Map(
    positions.map((pos) => {
      return [
        pos.tokenId.toString(),
        PositionDetails.fromPositionStateStruct(chainId, pos),
      ] as const;
    }),
  );
}
