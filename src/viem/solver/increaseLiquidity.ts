import { ApertureSupportedChainId, getLogger } from '@/index';
import { FixedPoint96, getAmountsForLiquidity } from '@/liquidity';
import {
  IncreaseOptions,
  Position,
  TickMath,
} from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { DEFAULT_SOLVERS, E_Solver, SwapRoute, getSolver } from '.';
import {
  FEE_ZAP_RATIO,
  IncreaseLiquidityParams,
  estimateIncreaseLiquidityFromTokenInGas,
  estimateIncreaseLiquidityOptimalV4Gas,
  simulateIncreaseLiquidityFromTokenIn,
  simulateIncreaseLiquidityOptimalV4,
} from '../automan';
import {
  buildOptimalSolutions,
  getOptimalSwapAmountV4,
  solveExactInput,
} from './internal';
import { SolverResult, SwapPath } from './types';

/**
 * Get the optimal amount of liquidity to increase for a given pool and token amounts.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param publicClient Viem public client.
 * @param position The current position to simulate the call from.
 * @param increaseOptions Increase liquidity options.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param from The address to increase liquidity from.
 * @param tokenPricesUsd The token prices in USD.
 * @param blockNumber Optional. The block number to simulate the call from.
 * @param includeSolvers Optional. The solvers to include.
 */
export async function increaseLiquidityOptimalV4(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  position: Position,
  increaseOptions: IncreaseOptions,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  from: Address,
  tokenPricesUsd: [string, string],
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  blockNumber?: bigint,
): Promise<SolverResult[]> {
  if (!token0Amount.currency.sortsBefore(token1Amount.currency)) {
    throw new Error('token0 must be sorted before token1');
  }

  const increaseLiquidityParams: IncreaseLiquidityParams = {
    tokenId: BigInt(increaseOptions.tokenId.toString()),
    amount0Desired: BigInt(token0Amount.quotient.toString()),
    amount1Desired: BigInt(token1Amount.quotient.toString()),
    amount0Min: 0n, // 0 for simulation and estimating gas.
    amount1Min: 0n,
    deadline: BigInt(increaseOptions.deadline.toString()),
  };

  const token0 = position.pool.token0.address as Address;
  const token1 = position.pool.token1.address as Address;
  const { tickLower, tickUpper } = position;
  const feeOrTickSpacing =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? position.pool.tickSpacing
      : position.pool.fee;

  // Subtract fees from poolAmountIn before passing to solver
  // to prevent ERC20 Error: transfer amount exceeds balance.
  const { poolAmountIn, zeroForOne } = await getOptimalSwapAmountV4(
    chainId,
    amm,
    publicClient,
    token0,
    token1,
    feeOrTickSpacing,
    tickLower,
    tickUpper,
    increaseLiquidityParams.amount0Desired,
    increaseLiquidityParams.amount1Desired,
    blockNumber,
  );
  const swapFeeAmount = BigInt(
    new Big(poolAmountIn.toString()).mul(FEE_ZAP_RATIO).toFixed(0),
  );
  const swapAmountIn = poolAmountIn - swapFeeAmount;
  const token0FeeAmount = zeroForOne ? swapFeeAmount : 0n;
  const token1FeeAmount = zeroForOne ? 0n : swapFeeAmount;
  const tokenInPrice = zeroForOne ? tokenPricesUsd[0] : tokenPricesUsd[1];
  const tokenInDecimals = zeroForOne
    ? token0Amount.currency.decimals
    : token1Amount.currency.decimals;
  const feeUSD = new Big(swapFeeAmount.toString())
    .div(10 ** tokenInDecimals)
    .mul(tokenInPrice);
  // No need to subtract fees from increaseLiquidityParams.amount0Desired
  // and increaseLiquidityParams.amount1Desired because that's done in automan.
  getLogger().info('SDK.increaseLiquidityOptimalV4.fees ', {
    amm,
    chainId,
    tokenId: increaseOptions.tokenId,
    token0PricesUsd: tokenPricesUsd[0],
    token1PricesUsd: tokenPricesUsd[1],
    includeSolvers,
    amount0Desired: increaseLiquidityParams.amount0Desired,
    amount1Desired: increaseLiquidityParams.amount1Desired,
    zeroForOne,
    poolAmountIn: poolAmountIn, // before fees
    swapAmountIn: swapAmountIn, // after fees
    feeUSD: feeUSD.toFixed(),
    token0FeeAmount,
    token1FeeAmount,
  });

  const estimateGas = async (swapData: Hex) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateIncreaseLiquidityOptimalV4Gas(
          chainId,
          amm,
          publicClient,
          from,
          position,
          increaseLiquidityParams,
          swapData,
          token0FeeAmount,
          token1FeeAmount,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.increaseLiquidityOptimalV4.EstimateGas.Error', {
        error: JSON.stringify((e as Error).message),
        swapData,
        increaseLiquidityParams,
      });
      return 0n;
    }
  };

  const solve = async (solver: E_Solver) => {
    let [swapData, swapPath, swapRoute, priceImpact]: [
      Hex,
      SwapPath | undefined,
      SwapRoute | undefined,
      string | undefined,
    ] = ['0x', undefined, undefined, undefined];
    let liquidity: bigint = 0n;
    let amount0: bigint = increaseLiquidityParams.amount0Desired;
    let amount1: bigint = increaseLiquidityParams.amount1Desired;
    let gasFeeEstimation: bigint = 0n;

    try {
      const slippage = // numerator/denominator is more accurate than toSignificant()/100.
        Number(increaseOptions.slippageTolerance.numerator) /
        Number(increaseOptions.slippageTolerance.denominator);
      if (swapAmountIn > 0n) {
        ({ swapData, swapPath, swapRoute, priceImpact } = await getSolver(
          solver,
        ).solve({
          chainId,
          amm,
          from,
          token0,
          token1,
          feeOrTickSpacing,
          tickLower,
          tickUpper,
          slippage,
          poolAmountIn: swapAmountIn,
          zeroForOne,
          isUseOptimalSwapRouter: false, // False because frontend uses the latest automan, which has the optimalSwapRouter merged into it.
        }));
      }
      [liquidity, amount0, amount1] = await simulateIncreaseLiquidityOptimalV4(
        chainId,
        amm,
        publicClient,
        from,
        position,
        increaseLiquidityParams,
        swapData,
        token0FeeAmount,
        token1FeeAmount,
        blockNumber,
      );
      gasFeeEstimation = await estimateGas(swapData);

      return {
        solver,
        amount0,
        amount1,
        liquidity,
        gasFeeEstimation,
        feeUSD: feeUSD.toFixed(),
        token0FeeAmount,
        token1FeeAmount,
        swapData,
        swapPath,
        swapRoute,
        priceImpact,
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.increaseLiquidityOptimalV4.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        getLogger().warn('SDK.Solver.increaseLiquidityOptimalV4.Warn', {
          solver,
          warn: JSON.stringify((e as Error).message),
        });
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}

export async function increaseLiquidityFromTokenIn(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
  from: Address,
  increaseOptions: IncreaseOptions,
  position: Position,
  tokenIn: Token,
  tokenInAmount: bigint,
  tokenInPriceUsd: string,
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  blockNumber?: bigint,
): Promise<SolverResult> {
  const pool = position.pool;
  const [token0, token1] = [pool.token0, pool.token1];
  const feeOrTickSpacing =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? pool.tickSpacing
      : pool.fee;
  if (!blockNumber) {
    blockNumber = await publicClient.getBlockNumber();
  }
  const [amount0ForLiquidity, amount1ForLiquidity] = getAmountsForLiquidity(
    Big(pool.sqrtRatioX96.toString()),
    Big(TickMath.getSqrtRatioAtTick(position.tickLower).toString()),
    Big(TickMath.getSqrtRatioAtTick(position.tickUpper).toString()),
    /* liquidity= */ FixedPoint96.Q96, // arbitary large enough to reduce rounding errors to compute ratio
  );
  const t0Price = pool.token0Price.asFraction;
  const ratioToSwapToToken1 =
    // Check divide by 0.
    amount0ForLiquidity === '0' || t0Price.numerator.toString() === '0'
      ? Big(1)
      : amount1ForLiquidity === '0' || t0Price.denominator.toString() === '0'
        ? Big(0)
        : // ratioToSwapToToken1 = b / (aInTermsOfB + b)
          Big(amount1ForLiquidity).div(
            Big(amount0ForLiquidity)
              .mul(t0Price.numerator.toString())
              .div(t0Price.denominator.toString())
              .add(amount1ForLiquidity),
          );
  let tokenInAmountToSwapToToken1 = BigInt(
    ratioToSwapToToken1.mul(tokenInAmount.toString()).toFixed(0),
  );
  let tokenInAmountToSwapToToken0 = tokenInAmount - tokenInAmountToSwapToToken1;
  const token2ToToken0FeeAmount = BigInt(
    Big(
      (token0.address === tokenIn.address
        ? 0n
        : tokenInAmountToSwapToToken0
      ).toString(),
    )
      .mul(FEE_ZAP_RATIO)
      .toFixed(0),
  );
  const token2ToToken1FeeAmount = BigInt(
    Big(
      (token1.address === tokenIn.address
        ? 0n
        : tokenInAmountToSwapToToken1
      ).toString(),
    )
      .mul(FEE_ZAP_RATIO)
      .toFixed(0),
  );
  tokenInAmountToSwapToToken0 -= token2ToToken0FeeAmount;
  tokenInAmountToSwapToToken1 -= token2ToToken1FeeAmount;

  const slippage = // numerator/denominator is more accurate than toSignificant()/100.
    Number(increaseOptions.slippageTolerance.numerator) /
    Number(increaseOptions.slippageTolerance.denominator);
  const [token0SolverResult, token1SolverResult] = await Promise.all([
    solveExactInput(
      amm,
      chainId,
      from,
      /* tokenIn= */ tokenIn.address as Address,
      /* tokenOut= */ token0.address as Address,
      feeOrTickSpacing,
      tokenInAmountToSwapToToken0,
      slippage,
      includeSolvers,
    ),
    solveExactInput(
      amm,
      chainId,
      from,
      /* tokenIn= */ tokenIn.address as Address,
      /* tokenOut= */ token1.address as Address,
      feeOrTickSpacing,
      tokenInAmountToSwapToToken1,
      slippage,
      includeSolvers,
    ),
  ]);
  const [
    solver0,
    swapData0,
    swapPath0,
    swapRoute0,
    priceImpact0,
    solver1,
    swapData1,
    swapPath1,
    swapRoute1,
    priceImpact1,
  ] = [
    token0SolverResult.solver,
    token0SolverResult.swapData,
    token0SolverResult.swapPath,
    token0SolverResult.swapRoute,
    token0SolverResult.priceImpact,
    token1SolverResult.solver,
    token1SolverResult.swapData,
    token1SolverResult.swapPath,
    token1SolverResult.swapRoute,
    token1SolverResult.priceImpact,
  ];
  const feeUSD = Big(
    (token2ToToken0FeeAmount + token2ToToken1FeeAmount).toString(),
  )
    .mul(tokenInPriceUsd)
    .div(10 ** tokenIn.decimals);
  getLogger().info('SDK.increaseLiquidityFromTokenIn.fees ', {
    amm,
    chainId,
    tokenId: increaseOptions.tokenId,
    tokenInPriceUsd,
    includeSolvers,
    ratioToSwapToToken1: ratioToSwapToToken1.toFixed(),
    feeUSD: feeUSD.toFixed(),
    // token2 to token0 Swap
    solver0,
    token2ToToken0FeeAmount,
    tokenInAmountToSwapToToken0,
    token0SolverResults: token0SolverResult.solverResults,
    token0FromTokenIn: token0SolverResult.tokenOutAmount,
    // token2 to token1 Swap
    solver1,
    token2ToToken1FeeAmount,
    tokenInAmountToSwapToToken1,
    token1SolverResults: token1SolverResult.solverResults,
    token1FromTokenIn: token1SolverResult.tokenOutAmount,
  });
  // amountsDesired = The amount of tokenIn to swap due to stack too deep compiler error.
  const increaseLiquidityParams: IncreaseLiquidityParams = {
    tokenId: BigInt(increaseOptions.tokenId.toString()),
    amount0Desired: tokenInAmountToSwapToToken0,
    amount1Desired: tokenInAmountToSwapToToken1,
    amount0Min: 0n, // 0 for simulation and estimating gas.
    amount1Min: 0n,
    deadline: BigInt(increaseOptions.deadline.toString()),
  };
  const [liquidity] = await simulateIncreaseLiquidityFromTokenIn(
    amm,
    chainId,
    publicClient,
    from,
    increaseLiquidityParams,
    tokenIn.address as Address,
    /* tokenInFeeAmount= */ token2ToToken0FeeAmount + token2ToToken1FeeAmount,
    swapData0,
    swapData1,
    blockNumber,
  );
  const estimateGas = async (swapData0: Hex, swapData1: Hex) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateIncreaseLiquidityFromTokenInGas(
          amm,
          chainId,
          publicClient,
          from,
          increaseLiquidityParams,
          /* tokenIn= */ tokenIn.address as Address,
          /* tokenInFeeAmount= */ token2ToToken0FeeAmount +
            token2ToToken1FeeAmount,
          swapData0,
          swapData1,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.increaseLiquidityFromTokenIn.EstimateGas.Error', {
        error: JSON.stringify((e as Error).message),
        increaseLiquidityParams,
        swapData0,
        swapData1,
      });
      return 0n;
    }
  };
  const gasFeeEstimation = await estimateGas(swapData0, swapData1);

  return {
    // Use amounts for increaseLiquidityParams' amountsDesired in automan.
    amount0: tokenInAmountToSwapToToken0,
    amount1: tokenInAmountToSwapToToken1,
    // Use liquidity for compute incremental position, then mintAmountsWithSlippage() for increaseLiquidityParams' amountsMin in automan.
    liquidity,
    gasFeeEstimation,
    feeUSD: feeUSD.toFixed(),
    token0FeeAmount: token2ToToken0FeeAmount,
    token1FeeAmount: token2ToToken1FeeAmount,
    // token2 to token0 swap
    solver0,
    swapData0,
    swapPath0,
    swapRoute0,
    priceImpact0,
    // token2 to token01swap
    solver1,
    swapData1,
    swapPath1,
    swapRoute1,
    priceImpact1,
  } as SolverResult;
}
