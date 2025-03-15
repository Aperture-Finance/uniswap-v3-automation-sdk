import { SlipStreamSwapRouterAbi } from '@/abis/SlipStreamSwapRouter';
import { UniV3SwapRouter02Abi } from '@/abis/UniV3SwapRouter02';
import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

import { getERC20Overrides, getStateOverride } from '../overrides';
import { getPool } from '../pool';
import { getPublicClient } from '../public_client';
import { calcPriceImpact, getSwapPath, getSwapRoute } from './internal';
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
        slippage,
        poolAmountIn,
        zeroForOne,
        client,
      } = props;
      const publicClient = client ?? getPublicClient(chainId);
      const [toAmount, pool] = await Promise.all([
        getSamePoolToAmount(
          amm,
          chainId,
          publicClient,
          /* tokenIn= */ zeroForOne ? token0 : token1,
          /* tokenOut= */ zeroForOne ? token1 : token0,
          feeOrTickSpacing,
          poolAmountIn,
        ),
        getPool(token0, token1, feeOrTickSpacing, chainId, amm, publicClient),
      ]);
      const [amount0Init, amount1Init, amount0Final, amount1Final] = zeroForOne
        ? [poolAmountIn, 0n, 0n, toAmount]
        : [0n, poolAmountIn, toAmount, 0n];
      return {
        toAmount,
        swapData: '0x',
        swapPath: getSwapPath(
          token0,
          token1,
          /* initToken0Amount= */ amount0Init,
          /* initToken1Amount= */ amount1Init,
          /* finalToken0Amount= */ amount0Final,
          /* finalToken1Amount= */ amount1Final,
          slippage,
        ),
        swapRoute: getSwapRoute(
          token0,
          token1,
          /* deltaAmount0= */ amount0Final - amount0Init,
        ),
        priceImpact: calcPriceImpact(
          pool,
          /* initAmount0= */ amount0Init,
          /* initAmount1= */ amount1Init,
          /* finalAmount0= */ amount0Final,
          /* finalAmount1= */ amount1Final,
        ),
      };
    },
  };
};

export async function getSamePoolToAmount(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
  tokenIn: Address,
  tokenOut: Address,
  feeOrTickSpacing: number,
  amountIn: bigint,
  client?: PublicClient,
): Promise<bigint> {
  try {
    if (amountIn <= 0n) {
      throw new Error('amountIn should greater than 0');
    }
    const publicClient = client ?? getPublicClient(chainId);
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
  } catch {
    // SamePool may be spammy to log errors because using feeOrTickSpacing of token0/token1 for token0/token2.
    // Catch all errors. Don't throw errors since SamePool is the fallback.
    // Should at least return solverResult of 0n instead of no results.
    return 0n;
  }
}
