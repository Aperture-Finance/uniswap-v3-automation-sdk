import { SlipStreamSwapRouterAbi } from '@/abis/SlipStreamSwapRouter';
import { UniV3SwapRouter02Abi } from '@/abis/UniV3SwapRouter02';
import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address } from 'viem';

import { getERC20Overrides, getStateOverride } from '../overrides';
import { getPublicClient } from '../public_client';
import { ISolver } from './types';

export const getSamePoolSolver = (): ISolver => {
  return {
    solve: async (props) => {
      const {
        amm,
        chainId,
        token0,
        token1,
        feeOrTickSpacing,
        poolAmountIn,
        zeroForOne,
      } = props;
      const toAmount: bigint = await getSamePoolToAmount(
        amm,
        chainId,
        /* tokenIn= */ zeroForOne ? token0 : token1,
        /* tokenOut= */ zeroForOne ? token1 : token0,
        feeOrTickSpacing,
        poolAmountIn,
      );
      return {
        toAmount,
        swapData: '0x',
      };
    },
  };
};

export async function getSamePoolToAmount(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  tokenIn: Address,
  tokenOut: Address,
  feeOrTickSpacing: number,
  amountIn: bigint,
): Promise<bigint> {
  try {
    if (amountIn <= 0n) {
      throw new Error('amountIn should greater than 0');
    }
    const publicClient = getPublicClient(chainId);
    const { swapRouter } = getAMMInfo(chainId, amm)!;
    const stateOverride = getStateOverride(
      await getERC20Overrides(
        /* token= */ tokenIn,
        // Spender doesn't matter to get a SamePool quote.
        /* from= */ swapRouter,
        /* to= */ swapRouter,
        /* amount= */ BigInt(amountIn),
        publicClient,
      ),
    );
    const simulationResults = await publicClient.simulateContract({
      abi:
        amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
          ? SlipStreamSwapRouterAbi
          : UniV3SwapRouter02Abi,
      address: swapRouter,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn,
          tokenOut,
          // Either fee or (tickSpacing and deadline) will be filtered when encoding Abi Parameters.
          fee: feeOrTickSpacing,
          tickSpacing: feeOrTickSpacing,
          recipient: swapRouter,
          deadline: Math.floor(Date.now() / 1000) + 60 * 30,
          amountIn,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        },
      ] as const,
      ...stateOverride,
      account: swapRouter,
    });
    return BigInt(simulationResults.result ?? '0');
  } catch (e) {
    // SamePool may be spammy to log errors because using feeOrTickSpacing of token0/token1 for token0/token2.
    // Catch all errors. Don't throw errors since SamePool is the fallback.
    // Should at least return solverResult of 0n instead of no results.
    return 0n;
  }
}
