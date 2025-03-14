import { getAMMInfo } from '@/chain';
import { ApertureSupportedChainId } from '@/interfaces';
import { IUniswapV3Pool__factory } from 'aperture-lens';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

export type SlipStreamPool = {
  address: Address;
  token0: Address;
  token1: Address;
  fee: number;
  tickSpacing: number;
  gaugeAddress: Address;
};

export async function getSlipStreamPools(
  publicClient: PublicClient,
  chainId: ApertureSupportedChainId,
  blockNumber?: bigint,
) {
  const ammInfo = getAMMInfo(chainId, AutomatedMarketMakerEnum.enum.SLIPSTREAM);
  const opt = {
    blockNumber,
  };

  const length = await publicClient.readContract({
    address: ammInfo!.factory,
    abi: [
      {
        inputs: [],
        name: 'allPoolsLength',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'allPoolsLength',
    ...opt,
  });

  const poolAddresses = (
    await publicClient.multicall({
      contracts: Array.from({ length: Number(length) }).map((_, index) => ({
        address: ammInfo!.factory,
        abi: [
          {
            inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
            name: 'allPools',
            outputs: [{ internalType: 'address', name: '', type: 'address' }],
            stateMutability: 'view',
            type: 'function',
          },
        ] as const,
        functionName: 'allPools',
        args: [BigInt(index)],
      })),
      ...opt,
    })
  ).map(({ result }) => result!);

  const gaugeAddresses = (
    await publicClient.multicall({
      contracts: poolAddresses.map((address) => ({
        address,
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
      })),
      ...opt,
    })
  ).map(({ result }) => result!);

  const getPoolKeys = (address: Address) => {
    const poolOpt = {
      address,
      abi: IUniswapV3Pool__factory.abi,
      blockNumber,
    };
    return [
      { functionName: 'token0', ...poolOpt },
      { functionName: 'token1', ...poolOpt },
      { functionName: 'fee', ...poolOpt },
      { functionName: 'tickSpacing', ...poolOpt },
    ];
  };

  const poolData = (
    await publicClient.multicall({
      contracts: poolAddresses.map((addr) => getPoolKeys(addr)).flat(),
      ...opt,
    })
  ).map(({ result }) => result!);

  const pools: SlipStreamPool[] = [];
  for (let i = 0; i < length; i++) {
    const [token0, token1, fee, tickSpacing] = poolData.slice(
      i * 4,
      i * 4 + 4,
    ) as [Address, Address, number, number];
    pools.push({
      address: poolAddresses[i],
      token0,
      token1,
      fee,
      tickSpacing,
      gaugeAddress: gaugeAddresses[i],
    });
  }

  return pools;
}
