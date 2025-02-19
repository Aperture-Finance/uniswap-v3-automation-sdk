import { ApertureSupportedChainId, getLogger } from '@/index';
import { RemoveLiquidityOptions } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { DEFAULT_SOLVERS, E_Solver } from '.';
import {
  DecreaseLiquidityParams,
  FEE_ZAP_RATIO,
  estimateDecreaseLiquidityToTokenOutGas,
  getFeeReinvestRatio,
  simulateDecreaseLiquidity,
} from '../automan';
import { PositionDetails } from '../position';
import { getSwapRoute, solveExactInput } from './internal';
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
): Promise<SolverResult> {
  const liquidity =
    (BigInt(positionDetails.liquidity.toString()) *
      BigInt(
        decreaseLiquidityOptions.liquidityPercentage.numerator.toString(),
      )) /
    BigInt(decreaseLiquidityOptions.liquidityPercentage.denominator.toString());
  const decreaseLiquidityParams: DecreaseLiquidityParams = {
    tokenId: BigInt(decreaseLiquidityOptions.tokenId.toString()),
    liquidity,
    amount0Min: 0n, // 0 for simulation and estimating gas.
    amount1Min: 0n,
    deadline: BigInt(decreaseLiquidityOptions.deadline.toString()),
  };
  const [token0, token1] = [positionDetails.token0, positionDetails.token1];
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
  // There's reinvest fees (fees on the position's collectedFees) and swap fees.
  const token0FeeAmount = BigInt(
    Big(positionDetails.tokensOwed0.quotient.toString())
      .mul(getFeeReinvestRatio(feeOrTickSpacing))
      .add(
        Big(
          token0.address === tokenOut ? '0' : positionInitialAmount0.toString(),
        ).mul(FEE_ZAP_RATIO),
      )
      .toFixed(0),
  );
  const token1FeeAmount = BigInt(
    Big(positionDetails.tokensOwed1.quotient.toString())
      .mul(getFeeReinvestRatio(feeOrTickSpacing))
      .add(
        Big(
          token1.address === tokenOut ? '0' : positionInitialAmount1.toString(),
        ).mul(FEE_ZAP_RATIO),
      )
      .toFixed(0),
  );
  const token0SwapIn = positionInitialAmount0 - token0FeeAmount;
  const token1SwapIn = positionInitialAmount1 - token1FeeAmount;

  const slippage = // numerator/denominator is more accurate than toSignificant()/100.
    Number(decreaseLiquidityOptions.slippageTolerance.numerator) /
    Number(decreaseLiquidityOptions.slippageTolerance.denominator);
  const [token0SolverResult, token1SolverResult] = await Promise.all([
    solveExactInput(
      amm,
      chainId,
      from,
      /* tokenIn= */ token0.address as Address,
      tokenOut,
      feeOrTickSpacing,
      token0SwapIn,
      slippage,
      includeSolvers,
    ),
    solveExactInput(
      amm,
      chainId,
      from,
      /* tokenIn= */ token1.address as Address,
      tokenOut,
      feeOrTickSpacing,
      token1SwapIn,
      slippage,
      includeSolvers,
    ),
  ]);
  const [solver, swapData, swapRoute, solver1, swapData1, swapRoute1] = [
    token0SolverResult.solver,
    token0SolverResult.swapData,
    token0SolverResult.swapRoute,
    token1SolverResult.solver,
    token1SolverResult.swapData,
    token1SolverResult.swapRoute,
  ];
  const tokenOutAmount =
    token0SolverResult.tokenOutAmount + token1SolverResult.tokenOutAmount;
  const feeUSD = Big(token0FeeAmount.toString())
    .div(10 ** token0.decimals)
    .mul(tokenPricesUsd[0])
    .add(
      Big(token1FeeAmount.toString())
        .div(10 ** token1.decimals)
        .mul(tokenPricesUsd[1]),
    );
  getLogger().info('SDK.decreaseLiquidityToTokenOut.fees ', {
    solvers: includeSolvers,
    solver0: solver,
    solver1,
    amm,
    chainId,
    position: decreaseLiquidityOptions.tokenId,
    feeUSD: feeUSD.toString(),
    token0PricesUsd: tokenPricesUsd[0],
    token1PricesUsd: tokenPricesUsd[1],
    positionInitialAmount0,
    positionInitialAmount1,
    token0FeeAmount,
    token1FeeAmount,
    tokenOut,
    tokenOutAmount,
    liquidity,
    token0SwapIn,
    tokenOutFromToken0: token0SolverResult.tokenOutAmount,
    token1SwapIn,
    tokenOutFromToken1: token1SolverResult.tokenOutAmount,
    token0SolverResults: token0SolverResult.solverResults,
    token1SolverResults: token1SolverResult.solverResults,
  });

  const estimateGas = async (swapData0: Hex, swapData1: Hex) => {
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
          token0FeeAmount,
          token1FeeAmount,
          swapData0,
          swapData1,
          isUnwrapNative,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.decreaseLiquidityToTokenOut.EstimateGas.Error', {
        error: JSON.stringify((e as Error).message),
        decreaseLiquidityParams,
        swapData0,
        swapData1,
      });
      return 0n;
    }
  };
  const gasFeeEstimation = await estimateGas(swapData, swapData1);

  const [swap0Token0, swap0Token1, swap0deltaAmount0] =
    token0.address < tokenOut
      ? [token0.address as Address, tokenOut, -token0SwapIn]
      : [
          tokenOut,
          token0.address as Address,
          token0SwapIn, // inaccurate, but correct sign, which is only thing that matters
        ];
  const [swap1Token0, swap1Token1, swap1deltaAmount0] =
    token1.address < tokenOut
      ? [token1.address as Address, tokenOut, -token1SwapIn]
      : [
          tokenOut,
          token1.address as Address,
          token1SwapIn, // inaccurate, but correct sign, which is only thing that matters
        ];
  return {
    solver,
    solver1,
    // The sum of amounts is the expected tokenOutAmount.
    amount0: token0SolverResult.tokenOutAmount,
    amount1: token1SolverResult.tokenOutAmount,
    // Use liquidity for compute decremental position, then mintAmountsWithSlippage() for decreaseLiquidityParams' amountsMin in automan.
    liquidity,
    swapData,
    swapData1,
    gasFeeEstimation,
    swapRoute: getSwapRoute(
      /* token0= */ swap0Token0,
      /* token1= */ swap0Token1,
      /* deltaAmount0= */ swap0deltaAmount0,
      swapRoute,
    ),
    swapRoute1: getSwapRoute(
      /* token0= */ swap1Token0,
      /* token1= */ swap1Token1,
      /* deltaAmount0= */ swap1deltaAmount0,
      swapRoute1,
    ),
    feeUSD: feeUSD.toFixed(),
    token0FeeAmount,
    token1FeeAmount,
  } as SolverResult;
}
