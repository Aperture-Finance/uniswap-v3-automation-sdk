import { Address, PublicClient } from 'viem';

import { getSlipStreamPools } from '../pool';

export type SlipStreamPosition = {
  address: Address;
  gaugeAddress: Address;
};

export async function getSlipStreamStakePositions(
  owner: Address,
  publicClient: PublicClient,
  blockNumber?: bigint,
) {
  const pools = await getSlipStreamPools(publicClient, blockNumber);
  const gaugeAddresses = pools.map((pool) => pool.gaugeAddress);
  const opt = {
    blockNumber,
  };

  const stakedPositions = (
    await publicClient.multicall({
      contracts: gaugeAddresses.map((address) => ({
        address: address,
        abi: [
          {
            inputs: [
              { internalType: 'address', name: 'depositor', type: 'address' },
            ],
            name: 'stakedValues',
            outputs: [
              { internalType: 'uint256[]', name: 'staked', type: 'uint256[]' },
            ],
            stateMutability: 'view',
            type: 'function',
          },
        ] as const,
        functionName: 'stakedValues',
        args: [owner],
        ...opt,
      })),
    })
  ).map(({ result }) => result! ?? []);

  return stakedPositions.reduce(
    (accumulator, value) => accumulator.concat(value),
    [],
  );
}
