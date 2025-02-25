import { ApertureSupportedChainId, getLogger } from '@/index';
import { FixedPoint96, getAmountsForLiquidity } from '@/liquidity';
import { Pool, TickMath } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import {
  DEFAULT_SOLVERS,
  E_Solver,
  SolverResult,
  SwapRoute,
  getSolver,
} from '.';
import {
  FEE_ZAP_RATIO,
  SlipStreamMintParams,
  UniV3MintParams,
  estimateMintFromTokenInGas,
  estimateMintOptimalV4Gas,
  simulateMintFromTokenIn,
  simulateMintOptimalV4,
} from '../automan';
import { getPool } from '../pool';
import {
  buildOptimalSolutions,
  calcPriceImpact,
  getOptimalSwapAmountV4,
  getSwapPath,
  getSwapRoute,
  solveExactInput,
} from './internal';

/**
 * Get the optimal amount of liquidity to mint for a given pool and token amounts.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param feeOrTickSpacing The pool fee tier or tick spacing.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param from The address to mint from.
 * @param slippage The slippage tolerance.
 * @param tokenPricesUsd The token prices in USD.
 * @param publicClient Viem public client.
 * @param blockNumber Optional. The block number to use for the simulation.
 * @param includeSolvers Optional. The solvers to include.
 */
export async function mintOptimalV4(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  feeOrTickSpacing: number,
  tickLower: number,
  tickUpper: number,
  from: Address,
  slippage: number,
  tokenPricesUsd: [string, string],
  publicClient: PublicClient,
  blockNumber?: bigint,
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
): Promise<SolverResult[]> {
  if (!token0Amount.currency.sortsBefore(token1Amount.currency)) {
    throw new Error('token0 must be sorted before token1');
  }
  if (!blockNumber) {
    blockNumber = await publicClient.getBlockNumber();
  }

  const token0 = token0Amount.currency.address as Address;
  const token1 = token1Amount.currency.address as Address;
  const mintParams: SlipStreamMintParams | UniV3MintParams =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? {
          token0,
          token1,
          tickSpacing: feeOrTickSpacing,
          tickLower,
          tickUpper,
          amount0Desired: BigInt(token0Amount.quotient.toString()),
          amount1Desired: BigInt(token1Amount.quotient.toString()),
          amount0Min: 0n, // 0 for simulation and estimating gas.
          amount1Min: 0n,
          recipient: from,
          deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
          sqrtPriceX96: 0n,
        }
      : {
          token0,
          token1,
          fee: feeOrTickSpacing,
          tickLower,
          tickUpper,
          amount0Desired: BigInt(token0Amount.quotient.toString()),
          amount1Desired: BigInt(token1Amount.quotient.toString()),
          amount0Min: 0n, // 0 for simulation and estimating gas.
          amount1Min: 0n,
          recipient: from,
          deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
        };

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
    mintParams.amount0Desired,
    mintParams.amount1Desired,
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

  getLogger().info('SDK.mintOptimalV4.Fees ', {
    amm,
    chainId,
    feeUSD: feeUSD.toString(),
    token0PricesUsd: tokenPricesUsd[0],
    token1PricesUsd: tokenPricesUsd[1],
    token0FeeAmount: token0FeeAmount.toString(),
    token1FeeAmount: token1FeeAmount.toString(),
    amount0Desired: mintParams.amount0Desired.toString(),
    amount1Desired: mintParams.amount1Desired.toString(),
    zeroForOne,
    poolAmountIn: poolAmountIn.toString(), // before fees
    swapAmountIn: swapAmountIn.toString(), // after fees
  });

  const estimateGas = async (swapData: Hex) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateMintOptimalV4Gas(
          chainId,
          amm,
          publicClient,
          from,
          mintParams,
          swapData,
          token0FeeAmount,
          token1FeeAmount,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.mintOptimalV4.EstimateGas.Error', {
        error: JSON.stringify((e as Error).message),
        swapData,
        mintParams,
      });
      return 0n;
    }
  };

  const solve = async (solver: E_Solver) => {
    let swapData: Hex = '0x';
    let swapRoute: SwapRoute | undefined = undefined;
    let liquidity: bigint = 0n;
    let amount0: bigint = mintParams.amount0Desired;
    let amount1: bigint = mintParams.amount1Desired;
    let gasFeeEstimation: bigint = 0n;

    try {
      if (swapAmountIn > 0n) {
        ({ swapData, swapRoute } = await getSolver(solver).mintOptimal({
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
      [, liquidity, amount0, amount1] = await simulateMintOptimalV4(
        chainId,
        amm,
        publicClient,
        from,
        mintParams,
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
        swapData,
        gasFeeEstimation,
        swapRoute: getSwapRoute(
          token0,
          token1,
          amount0 - mintParams.amount0Desired,
          swapRoute,
        ),
        priceImpact: calcPriceImpact(
          await getPool(
            token0,
            token1,
            feeOrTickSpacing,
            chainId,
            amm,
            publicClient,
            blockNumber,
          ),
          mintParams.amount0Desired,
          mintParams.amount1Desired,
          amount0,
          amount1,
        ),
        swapPath: getSwapPath(
          mintParams.token0,
          mintParams.token1,
          mintParams.amount0Desired,
          mintParams.amount1Desired,
          amount0,
          amount1,
          slippage,
        ),
        feeUSD: feeUSD.toFixed(),
        token0FeeAmount,
        token1FeeAmount,
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.mintOptimalV4.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
          mintParams,
        });
      } else {
        getLogger().warn('SDK.Solver.mintOptimalV4.Warn', {
          solver,
          warn: JSON.stringify((e as Error).message),
        });
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}

export async function mintFromTokenIn(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
  from: Address,
  pool: Pool,
  tickLower: number,
  tickUpper: number,
  tokenIn: Token,
  tokenInAmount: bigint,
  slippage: number,
  tokenInPriceUsd: string,
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  blockNumber?: bigint,
): Promise<SolverResult> {
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
    Big(TickMath.getSqrtRatioAtTick(tickLower).toString()),
    Big(TickMath.getSqrtRatioAtTick(tickUpper).toString()),
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
  const [solver0, swapData0, swapRoute0, solver1, swapData1, swapRoute1] = [
    token0SolverResult.solver,
    token0SolverResult.swapData,
    token0SolverResult.swapRoute,
    token1SolverResult.solver,
    token1SolverResult.swapData,
    token1SolverResult.swapRoute,
  ];
  const feeUSD = Big(
    (token2ToToken0FeeAmount + token2ToToken1FeeAmount).toString(),
  )
    .mul(tokenInPriceUsd)
    .div(10 ** tokenIn.decimals);
  getLogger().info('SDK.mintFromTokenIn.fees ', {
    solvers: includeSolvers,
    solver0,
    solver1,
    amm,
    chainId,
    feeUSD: feeUSD.toString(),
    toSwapRratioToSwapToToken1atio: ratioToSwapToToken1.toString(),
    // Token0 Swap
    token2ToToken0FeeAmount,
    tokenInAmountToSwapToToken0,
    token0SolverResults: token0SolverResult.solverResults,
    token0FromTokenIn: token0SolverResult.tokenOutAmount,
    // Token1 Swap
    token2ToToken1FeeAmount,
    tokenInAmountToSwapToToken1,
    token1SolverResults: token1SolverResult.solverResults,
    token1FromTokenIn: token1SolverResult.tokenOutAmount,
  });
  // amountsDesired = The amount of tokenIn to swap due to stack too deep compiler error.
  const mintParams: SlipStreamMintParams | UniV3MintParams =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? {
          token0: token0.address as Address,
          token1: token1.address as Address,
          tickSpacing: pool.tickSpacing,
          tickLower,
          tickUpper,
          amount0Desired: tokenInAmountToSwapToToken0,
          amount1Desired: tokenInAmountToSwapToToken1,
          amount0Min: 0n, // 0 for simulation and estimating gas.
          amount1Min: 0n,
          recipient: from,
          deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
          sqrtPriceX96: 0n,
        }
      : {
          token0: token0.address as Address,
          token1: token1.address as Address,
          fee: pool.fee,
          tickLower,
          tickUpper,
          amount0Desired: tokenInAmountToSwapToToken0,
          amount1Desired: tokenInAmountToSwapToToken1,
          amount0Min: 0n, // 0 for simulation and estimating gas.
          amount1Min: 0n,
          recipient: from,
          deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
        };
  const [, liquidity] = await simulateMintFromTokenIn(
    amm,
    chainId,
    publicClient,
    from,
    mintParams,
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
        estimateMintFromTokenInGas(
          amm,
          chainId,
          publicClient,
          from,
          mintParams,
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
      getLogger().error('SDK.mintFromTokenIn.EstimateGas.Error', {
        error: JSON.stringify((e as Error).message),
        mintParams,
        swapData0,
        swapData1,
      });
      return 0n;
    }
  };
  const gasFeeEstimation = await estimateGas(swapData0, swapData1);

  const [swap0Token0, swap0Token1, swap0deltaAmount0] =
    token0.address < tokenIn.address
      ? [token0.address, tokenIn.address, token0SolverResult.tokenOutAmount]
      : [tokenIn.address, token0.address, -tokenInAmountToSwapToToken0];
  const [swap1Token0, swap1Token1, swap1deltaAmount0] =
    token1.address < tokenIn.address
      ? [token1.address, tokenIn.address, token1SolverResult.tokenOutAmount]
      : [tokenIn.address, token1.address, -tokenInAmountToSwapToToken1];
  return {
    solver0,
    solver1,
    // Use amounts for mintParams' amountsDesired in automan.
    amount0: tokenInAmountToSwapToToken0,
    amount1: tokenInAmountToSwapToToken1,
    // Use liquidity for compute minted position, then mintAmountsWithSlippage() for mintParams' amountsMin in automan.
    liquidity,
    swapData0,
    swapData1,
    gasFeeEstimation,
    swapRoute0: getSwapRoute(
      /* token0= */ swap0Token0 as Address,
      /* token1= */ swap0Token1 as Address,
      /* deltaAmount0= */ swap0deltaAmount0,
      swapRoute0,
    ),
    swapRoute1: getSwapRoute(
      /* token0= */ swap1Token0 as Address,
      /* token1= */ swap1Token1 as Address,
      /* deltaAmount0= */ swap1deltaAmount0,
      swapRoute1,
    ),
    feeUSD: feeUSD.toFixed(),
    token0FeeAmount: token2ToToken0FeeAmount,
    token1FeeAmount: token2ToToken1FeeAmount,
  } as SolverResult;
}
