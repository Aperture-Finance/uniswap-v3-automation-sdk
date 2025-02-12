import { swapRouter02Abi } from '@/abis/SwapRouter02';
import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { Address } from 'viem';

import { getERC20Overrides, getStateOverride } from '../overrides';
import { getPublicClient } from '../public_client';
import { ISolver } from './types';

export const getSamePoolSolver = (): ISolver => {
  return {
    mintOptimal: async (props) => {
      const {
        amm,
        chainId,
        token0,
        token1,
        feeOrTickSpacing,
        poolAmountIn,
        zeroForOne,
      } = props;
      // Default toAmount to 0 in case no other solvers are available.
      let toAmount: bigint = 0n;
      try {
        const { swapRouter } = getAMMInfo(chainId, amm)!;
        toAmount = await getSamePoolToAmount(
          chainId,
          /* tokenIn= */ zeroForOne ? token0 : token1,
          /* tokenOut= */ zeroForOne ? token1 : token0,
          feeOrTickSpacing,
          /* swapRouterAddress= */ swapRouter!,
          poolAmountIn,
        );
      } catch {
        // Catch all errors. Don't throw errors since SamePool is the fallback.
      }
      return {
        toAmount,
        swapData: '0x',
      };
    },
  };
};

export async function getSamePoolToAmount(
  chainId: ApertureSupportedChainId,
  tokenIn: Address,
  tokenOut: Address,
  feeOrTickSpacing: number,
  swapRouter: Address,
  amountIn: bigint,
): Promise<bigint> {
  if (amountIn <= 0n) {
    throw new Error('amountIn should greater than 0');
  }
  const publicClient = getPublicClient(chainId);
  const tokenInOverrides = await getERC20Overrides(
    /* token= */ tokenIn,
    // Spender doesn't matter to get a SamePool quote.
    /* from= */ swapRouter,
    /* to= */ swapRouter,
    /* amount= */ BigInt(amountIn),
    publicClient,
  );
  return BigInt(
    (
      await publicClient.simulateContract({
        abi: swapRouter02Abi,
        address: swapRouter,
        functionName: 'exactInputSingle',
        args: [
          {
            tokenIn,
            tokenOut,
            fee: feeOrTickSpacing,
            recipient: swapRouter,
            deadline: Math.floor(Date.now() / 1000) + 60 * 30,
            amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0,
          },
        ] as const,
        ...getStateOverride(tokenInOverrides),
        account: swapRouter,
      })
    ).result ?? '0',
  );
}
