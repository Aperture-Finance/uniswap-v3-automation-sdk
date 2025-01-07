import { IERC20__factory } from '@/typechain-types';
import { Address, PublicClient } from 'viem';

export async function bulkGetTokenBalance(
  client: PublicClient,
  wallet: Address,
  tokens: Address[],
) {
  return client.multicall({
    contracts: tokens.map((token) => ({
      address: token,
      abi: IERC20__factory.abi,
      functionName: 'balanceOf',
      args: [wallet],
    })),
  });
}
