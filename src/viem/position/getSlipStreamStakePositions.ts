import { Address, PublicClient } from 'viem';

import { getSlipStreamPools } from '../pool';

export async function getSlipStreamStakePositions(
  owner: Address,
  publicClient: PublicClient,
  blockNumber?: bigint,
) {
  const pools = await getSlipStreamPools(publicClient, blockNumber);
  const opt = {
    blockNumber,
  };

  const gaugeAddresses = (
    await publicClient.multicall({
      contracts: pools.map((pool) => ({
        address: pool.address,
        abi: [
          {
            inputs: [],
            name: 'gauge',
            outputs: [{ internalType: 'address', name: '', type: 'address' }],
            stateMutability: 'view',
            type: 'function',
          },
        ] as const,
        functionName: 'gauge',
        ...opt,
      })),
    })
  ).map(({ result }) => result!);

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
