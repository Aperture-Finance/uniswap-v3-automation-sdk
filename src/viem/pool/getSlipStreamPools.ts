import { getAMMInfo } from '@/chain';
import { ApertureSupportedChainId } from '@/interfaces';
import { PublicClient } from 'viem';

const chainId = ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID;
// const amm = AutomatedMarketMakerEnum.SLIPSTREAM;
const amm = 'SlipStream';

const CLFactoryABI = [
  {
    inputs: [],
    name: 'allPoolsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'allPools',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export async function getSlipStreamPools(publicClient: PublicClient) {
  const ammInfo = getAMMInfo(chainId, amm);

  console.log('ammInfo', ammInfo);
  const length = await publicClient.readContract({
    address: ammInfo!.factory,
    abi: CLFactoryABI,
    functionName: 'allPoolsLength',
  });

  console.log('length', length);

  const poolAddresses = (
    await publicClient.multicall({
      contracts: Array.from({ length: Number(length) }).map((_, index) => ({
        address: ammInfo!.factory,
        abi: CLFactoryABI,
        functionName: 'allPools',
        args: [BigInt(index)],
      })),
    })
  ).map(({ result }) => result);

  // TODO: get pool detail

  console.log('poolAddresses', poolAddresses.length, poolAddresses);
}
