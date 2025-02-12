import { swapRouter02Abi } from '@/abis/SwapRouter02';
import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
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
      const { swapRouter } = getAMMInfo(chainId, amm)!;
      if (!swapRouter) {
        throw new Error('Chain or AMM not supported');
      }
      return {
        toAmount: BigInt(
          await getSamePoolSwap(
            amm,
            chainId,
            /* tokenIn= */ zeroForOne ? token0 : token1,
            /* tokenOut= */ zeroForOne ? token1 : token0,
            feeOrTickSpacing,
            /* swapRouterAddress= */ swapRouter,
            poolAmountIn,
          ),
        ),
        swapData: '0x',
      };
    },
  };
};

export async function getSamePoolSwap(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  tokenIn: Address,
  tokenOut: Address,
  feeOrTickSpacing: number,
  swapRouter: Address,
  amountIn: bigint,
): Promise<string> {
  if (amountIn === 0n) {
    throw new Error('amountIn should greater than 0');
  }
  const publicClient = getPublicClient(chainId);
  const tokenInOverrides = await getERC20Overrides(
    /* token= */ tokenIn,
    /* from= */ swapRouter,
    /* to= */ swapRouter,
    /* amount= */ BigInt(amountIn),
    publicClient,
  );
  return (
    (
      await getPublicClient(chainId).simulateContract({
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
    ).result ?? '0' // Default to 0 as a fallback, in case no other solvers are available.
  );
}
