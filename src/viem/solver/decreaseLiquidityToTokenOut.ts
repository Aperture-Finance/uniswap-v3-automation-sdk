import { ApertureSupportedChainId, getLogger } from '@/index';
import { token } from '@/typechain-typesV4/@openzeppelin/contracts';
import { RemoveLiquidityOptions } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { DEFAULT_SOLVERS, E_Solver, SwapRoute, getSolver } from '.';
import {
  DecreaseLiquidityParams,
  FEE_ZAP_RATIO,
  estimateDecreaseLiquidityToTokenOutGas,
  simulateDecreaseLiquidity,
  simulateDecreaseLiquidityToTokenOut,
} from '../automan';
import { PositionDetails } from '../position';
import { buildOptimalSolutions, getSwapRoute } from './internal';
import { SolverResult } from './types';

/**
 * Get the optimal amount of liquidity to decrease for a given pool and token amounts.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param publicClient Viem public client.
 * @param positionDetails Uniswap SDK PositionDetails for the specified position.
 * @param decreaseLiquidityOptions Decrease liquidity options.
 * @param zeroForOne If true, collect in token1. If false, collect in token0.
 * @param from The address to decrease liquidity for.
 * @param tokenPricesUsd The prices of the two tokens in the pool in usd.
 * @param blockNumber Optional. The block number to simulate the call from.
 * @param includeSolvers Optional. The solvers to include.
 */
export async function decreaseLiquidityToTokenOut(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
  from: Address,
  positionDetails: PositionDetails,
  decreaseLiquidityOptions: RemoveLiquidityOptions, // RemoveLiquidityOptions can be used for decreasing liquidity (<100%).
  tokenOut: Address,
  isUnwrapNative = true,
  tokenPricesUsd: [string, string],
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  blockNumber?: bigint,
): Promise<SolverResult[]> {
  // Use BigInt math for precision. liquidityToDecrease is not the liquidity from SolverResult, which is only used for comparing swapData.
  const liquidityToDecrease =
    (BigInt(positionDetails.liquidity.toString()) *
      BigInt(
        decreaseLiquidityOptions.liquidityPercentage.numerator.toString(),
      )) /
    BigInt(decreaseLiquidityOptions.liquidityPercentage.denominator.toString());
  const decreaseLiquidityParams: DecreaseLiquidityParams = {
    tokenId: BigInt(decreaseLiquidityOptions.tokenId.toString()),
    liquidity: liquidityToDecrease,
    amount0Min: 0n,
    amount1Min: 0n,
    deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
  };
  const token0 = positionDetails.token0;
  const token1 = positionDetails.token1;
  const feeOrTickSpacing =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? positionDetails.pool.tickSpacing
      : positionDetails.pool.fee;
  const [positionInitialAmount0, positionInitialAmount1] =
    await simulateDecreaseLiquidity(
      amm,
      chainId,
      publicClient,
      from,
      positionDetails.owner,
      decreaseLiquidityParams,
      /* token0FeeAmount= */ 0n,
      /* token1FeeAmount= */ 0n,
      isUnwrapNative,
      blockNumber,
    );
  const token0FeeAmount = BigInt(
    new Big(positionInitialAmount0.toString()).mul(FEE_ZAP_RATIO).toFixed(0),
  );
  const token1FeeAmount = BigInt(
    new Big(positionInitialAmount1.toString()).mul(FEE_ZAP_RATIO).toFixed(0),
  );
  // amountMins are used as feeAmounts due to stack too deep compiler error.
  decreaseLiquidityParams.amount0Min = token0FeeAmount;
  decreaseLiquidityParams.amount1Min = token1FeeAmount;
  const token0SwapIn = positionInitialAmount0 - token0FeeAmount;
  const token1SwapIn = positionInitialAmount1 - token1FeeAmount;

  const estimateGas = async (
    tokenOutMin: bigint,
    swapData0: Hex,
    swapData1: Hex,
  ) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateDecreaseLiquidityToTokenOutGas(
          amm,
          chainId,
          publicClient,
          from,
          positionDetails.owner,
          decreaseLiquidityParams,
          tokenOut,
          tokenOutMin,
          swapData0,
          swapData1,
          isUnwrapNative,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.decreaseLiquidityToTokenOutV4.EstimateGas.Error', {
        error: JSON.stringify((e as Error).message),
        decreaseLiquidityParams,
        swapData0,
        swapData1,
      });
      return 0n;
    }
  };

  const solve = async (solver: E_Solver) => {
    let swapData: Hex = '0x';
    let swapData1: Hex = '0x';
    let swapRoute: SwapRoute | undefined = undefined;
    let swapRoute1: SwapRoute | undefined = undefined;
    let tokenOutAmount: bigint = 0n;
    let gasFeeEstimation: bigint = 0n;
    const [swap0Token0, swap0Token1, swap0deltaAmount0] =
      token0.address < tokenOut
        ? [token0.address as Address, tokenOut, -token0SwapIn]
        : [
            tokenOut,
            token0.address as Address,
            /* only sign matters */ token0SwapIn,
          ];
    const [swap1Token0, swap1Token1, swap1deltaAmount0] =
      token1.address < tokenOut
        ? [token1.address as Address, tokenOut, -token1SwapIn]
        : [
            tokenOut,
            token1.address as Address,
            /* only sign matters */ token1SwapIn,
          ];

    try {
      if (token0SwapIn > 0n && token0.address != tokenOut) {
        // Although it's mintOptimal, it's the same swapData and swapRoute.
        ({ swapData, swapRoute } = await getSolver(solver).mintOptimal({
          chainId,
          amm,
          fromAddress: from,
          token0: swap0Token0,
          token1: swap0Token1,
          feeOrTickSpacing,
          tickLower: positionDetails.tickLower,
          tickUpper: positionDetails.tickUpper,
          slippage: 0, // Only apply slippage check to tokenOut, done in automan instead of solver.
          poolAmountIn: token0SwapIn,
          zeroForOne: token0.address < tokenOut,
          isUseOptimalSwapRouter: false, // False because frontend uses the latest automan, which has the optimalSwapRouter merged into it.
        }));
      }
      if (token1SwapIn > 0n && token1.address != tokenOut) {
        // Although it's mintOptimal, it's the same swapData and swapRoute.
        const solverResults1 = await getSolver(solver).mintOptimal({
          chainId,
          amm,
          fromAddress: from,
          token0: swap1Token0,
          token1: swap1Token1,
          feeOrTickSpacing,
          tickLower: positionDetails.tickLower,
          tickUpper: positionDetails.tickUpper,
          slippage: 0, // Only apply slippage check to tokenOut, done in automan instead of solver.
          poolAmountIn: token1SwapIn,
          zeroForOne: token1.address < tokenOut,
          isUseOptimalSwapRouter: false, // False because frontend uses the latest automan, which has the optimalSwapRouter merged into it.
        });
        [swapData1, swapRoute1] = [
          solverResults1.swapData,
          solverResults1.swapRoute,
        ];
      }
      tokenOutAmount = await simulateDecreaseLiquidityToTokenOut(
        amm,
        chainId,
        publicClient,
        from,
        positionDetails.owner,
        decreaseLiquidityParams,
        tokenOut,
        /* tokenOutMin= */ 0n,
        /* swapData0= */ swapData,
        swapData1,
        isUnwrapNative,
        blockNumber,
      );
      const tokenOutSlippage =
        (tokenOutAmount *
          BigInt(
            decreaseLiquidityOptions.slippageTolerance.numerator.toString(),
          )) /
        BigInt(
          decreaseLiquidityOptions.slippageTolerance.denominator.toString(),
        );
      const tokenOutAfterSlippage = tokenOutAmount - tokenOutSlippage;
      gasFeeEstimation = await estimateGas(
        tokenOutAfterSlippage,
        swapData,
        swapData1,
      );

      const feeUSD = Big(token0FeeAmount.toString())
        .div(10 ** token0.decimals)
        .mul(tokenPricesUsd[0])
        .add(
          Big(token1FeeAmount.toString())
            .div(10 ** token1.decimals)
            .mul(tokenPricesUsd[1]),
        );
      getLogger().info('SDK.decreaseLiquidityToTokenOutV4.fees ', {
        solver: solver,
        amm: amm,
        chainId: chainId,
        position: decreaseLiquidityOptions.tokenId,
        totalDecreaseLiquidityToTokenOutFeeUsd: feeUSD.toString(),
        token0PricesUsd: tokenPricesUsd[0],
        token1PricesUsd: tokenPricesUsd[1],
        positionInitialAmount0,
        positionInitialAmount1,
        token0FeeAmount,
        token1FeeAmount,
        tokenOut,
        tokenOutAmount,
        tokenOutAfterSlippage: tokenOutAfterSlippage.toString(),
        liquidityToDecrease: liquidityToDecrease.toString(),
        token0SwapIn,
        token1SwapIn,
      });

      return {
        solver,
        amount0: token0SwapIn, // Not used
        amount1: token1SwapIn, // Not used
        liquidity: tokenOutAfterSlippage, // Required for SolverResult, used for tokenOutMin and can be used to compare solvers.
        swapData,
        swapData1,
        gasFeeEstimation,
        swapRoute: getSwapRoute(
          /* token0= */ swap0Token0,
          /* token1= */ swap0Token1,
          /* deltaAmount0= */ swap0deltaAmount0, // Actual amount doesn't matter, just whether it's positive or negative.
          swapRoute,
        ),
        swapRoute1: getSwapRoute(
          /* token0= */ swap1Token0,
          /* token1= */ swap1Token1,
          /* deltaAmount0= */ swap1deltaAmount0, // Actual amount doesn't matter, just whether it's positive or negative.
          swapRoute1,
        ),
        feeUSD: feeUSD.toFixed(),
        token0FeeAmount,
        token1FeeAmount,
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.decreaseLiquidityToTokenOut.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        console.warn('SDK.Solver.decreaseLiquidityToTokenOut.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}
