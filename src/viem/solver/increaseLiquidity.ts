import { ApertureSupportedChainId, getAMMInfo, getLogger } from '@/index';
import { IncreaseOptions, Position } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import {
  DEFAULT_SOLVERS,
  E_Solver,
  SwapRoute,
  get1InchSwap,
  getIsOkx,
  getOkxSwap,
  getSolver,
} from '.';
import {
  FEE_ZAP_RATIO,
  IncreaseLiquidityParams,
  encodeOptimalSwapData,
  estimateIncreaseLiquidityOptimalGas,
  estimateIncreaseLiquidityOptimalV3Gas,
  getAutomanContract,
  simulateIncreaseLiquidityOptimal,
  simulateIncreaseLiquidityOptimalV3,
} from '../automan';
import { get1InchApproveTarget } from './get1InchSolver';
import { getOkxApproveTarget } from './getOkxSolver';
import {
  _getOptimalSwapAmount,
  buildOptimalSolutions,
  calcPriceImpact,
  getOptimalSwapAmount,
  getOptimalSwapAmountV3,
  getSwapPath,
  getSwapRoute,
} from './internal';
import { SolverResult } from './types';

/**
 * Get the optimal amount of liquidity to increase for a given pool and token amounts.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param provider A JSON RPC provider or a base provider.
 * @param position The current position to simulate the call from.
 * @param increaseOptions Increase liquidity options.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param from The address to increase liquidity from.
 * @param usePool Whether to use the pool or the aggregator for the swap.
 * @param blockNumber Optional. The block number to simulate the call from.
 * @param includeSwapInfo Optional. If set to true, the swap path and price impact will be included in the result.
 */
export async function increaseLiquidityOptimal(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  position: Position,
  increaseOptions: IncreaseOptions,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  from: Address,
  usePool = false,
  includeSwapInfo?: boolean,
  blockNumber?: bigint,
): Promise<SolverResult> {
  if (!token0Amount.currency.sortsBefore(token1Amount.currency)) {
    throw new Error('token0 must be sorted before token1');
  }
  const increaseLiquidityParams: IncreaseLiquidityParams = {
    tokenId: BigInt(increaseOptions.tokenId.toString()),
    amount0Desired: BigInt(token0Amount.quotient.toString()),
    amount1Desired: BigInt(token1Amount.quotient.toString()),
    amount0Min: 0n, // 0 for simulation and estimating gas.
    amount1Min: 0n,
    deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
  };

  const getEstimate = async () => {
    const { optimalSwapRouter } = getAMMInfo(chainId, amm)!;

    const poolPromise = increaseLiquidityOptimalPool(
      chainId,
      amm,
      publicClient,
      from,
      position,
      increaseLiquidityParams,
      blockNumber,
    );

    if (usePool || !optimalSwapRouter) {
      return await poolPromise;
    }

    const [poolEstimate, routerEstimate] = await Promise.all([
      poolPromise,
      increaseLiquidityOptimalRouter(
        chainId,
        amm,
        publicClient,
        from,
        position,
        increaseLiquidityParams,
        Number(increaseOptions.slippageTolerance.toSignificant()),
      ),
    ]);
    // use the same pool if the quote isn't better
    if (poolEstimate.liquidity >= routerEstimate.liquidity) {
      return poolEstimate;
    } else {
      return routerEstimate;
    }
  };

  const ret = await getEstimate();

  if (includeSwapInfo) {
    ret.priceImpact = calcPriceImpact(
      position.pool,
      increaseLiquidityParams.amount0Desired,
      increaseLiquidityParams.amount1Desired,
      ret.amount0,
      ret.amount1,
    );

    const token0 = (token0Amount.currency as Token).address as Address;
    const token1 = (token1Amount.currency as Token).address as Address;
    ret.swapPath = getSwapPath(
      token0,
      token1,
      BigInt(token0Amount.quotient.toString()),
      BigInt(token1Amount.quotient.toString()),
      ret.amount0,
      ret.amount1,
      Number(increaseOptions.slippageTolerance.toSignificant()) / 100,
    );
  }

  return ret;
}

async function increaseLiquidityOptimalPool(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  position: Position,
  increaseLiquidityParams: IncreaseLiquidityParams,
  blockNumber?: bigint,
): Promise<SolverResult> {
  const [liquidity, amount0, amount1] = await simulateIncreaseLiquidityOptimal(
    chainId,
    amm,
    publicClient,
    from,
    position,
    increaseLiquidityParams,
    /* swapData= */ undefined,
    blockNumber,
  );
  let swapRoute: SwapRoute = [];
  if (
    increaseLiquidityParams.amount0Desired.toString() !== amount0.toString()
  ) {
    const [fromTokenAddress, toTokenAddress] = new Big(
      increaseLiquidityParams.amount0Desired.toString(),
    ).gt(amount0.toString())
      ? [position.pool.token0.address, position.pool.token1.address]
      : [position.pool.token1.address, position.pool.token0.address];
    swapRoute = [
      [
        [
          {
            name: 'Pool',
            part: 100,
            fromTokenAddress: fromTokenAddress,
            toTokenAddress: toTokenAddress,
          },
        ],
      ],
    ];
  }

  return {
    solver: E_Solver.SamePool,
    amount0,
    amount1,
    liquidity,
    swapData: '0x',
    swapRoute,
  };
}

async function increaseLiquidityOptimalRouter(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  position: Position,
  increaseLiquidityParams: IncreaseLiquidityParams,
  slippage: number,
  blockNumber?: bigint,
): Promise<SolverResult> {
  const { solver, swapData, swapRoute } =
    await getIncreaseLiquidityOptimalSwapData(
      chainId,
      amm,
      publicClient,
      position,
      increaseLiquidityParams,
      slippage,
      /* includeRoute= */ true,
    );
  const [liquidity, amount0, amount1] = await simulateIncreaseLiquidityOptimal(
    chainId,
    amm,
    publicClient,
    from,
    position,
    increaseLiquidityParams,
    swapData,
    blockNumber,
  );
  return {
    solver,
    amount0,
    amount1,
    liquidity,
    swapData,
    swapRoute,
  };
}

async function getIncreaseLiquidityOptimalSwapData(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  position: Position,
  increaseLiquidityParams: IncreaseLiquidityParams,
  slippage: number,
  includeRoute?: boolean,
): Promise<{
  solver: E_Solver;
  swapData: Hex;
  swapRoute?: SwapRoute;
}> {
  try {
    const ammInfo = getAMMInfo(chainId, amm)!;
    const isOkx = getIsOkx();

    // get swap amounts using the same pool
    const { poolAmountIn, zeroForOne } = await _getOptimalSwapAmount(
      getAutomanContract,
      chainId,
      amm,
      publicClient,
      position.pool.token0.address as Address,
      position.pool.token1.address as Address,
      amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
        ? position.pool.tickSpacing
        : position.pool.fee,
      position.tickLower,
      position.tickUpper,
      increaseLiquidityParams.amount0Desired,
      increaseLiquidityParams.amount1Desired,
    );

    const approveTarget = await (isOkx
      ? getOkxApproveTarget(
          chainId,
          zeroForOne
            ? position.pool.token0.address
            : position.pool.token1.address,
          poolAmountIn.toString(),
        )
      : get1InchApproveTarget(chainId));
    const { tx, protocols } = await (isOkx
      ? getOkxSwap(
          chainId,
          zeroForOne
            ? position.pool.token0.address
            : position.pool.token1.address,
          zeroForOne
            ? position.pool.token1.address
            : position.pool.token0.address,
          poolAmountIn.toString(),
          ammInfo.optimalSwapRouter!,
          slippage,
        )
      : get1InchSwap(
          chainId,
          zeroForOne
            ? position.pool.token0.address
            : position.pool.token1.address,
          zeroForOne
            ? position.pool.token1.address
            : position.pool.token0.address,
          poolAmountIn.toString(),
          ammInfo.optimalSwapRouter!,
          slippage * 100,
          includeRoute,
        ));
    return {
      solver: isOkx ? E_Solver.OKX : E_Solver.OneInch,
      swapData: encodeOptimalSwapData(
        chainId,
        amm,
        position.pool.token0.address as Address,
        position.pool.token1.address as Address,
        position.pool.fee,
        position.tickLower,
        position.tickUpper,
        zeroForOne,
        approveTarget,
        tx.to,
        tx.data,
      ),
      swapRoute: protocols,
    };
  } catch (e) {
    console.warn(`Failed to get swap data: ${e}`);
  }
  return {
    solver: E_Solver.SamePool,
    swapData: '0x',
  };
}

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
 * @param blockNumber Optional. The block number to simulate the call from.
 * @param includeSolvers Optional. The solvers to include.
 */
export async function increaseLiquidityOptimalV2(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  position: Position,
  increaseOptions: IncreaseOptions,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  from: Address,
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
    deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
  };

  const token0 = position.pool.token0.address as Address;
  const token1 = position.pool.token1.address as Address;
  const { tickLower, tickUpper } = position;
  const feeOrTickSpacing =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? position.pool.tickSpacing
      : position.pool.fee;

  const { poolAmountIn, zeroForOne } = await getOptimalSwapAmount(
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

  const estimateGas = async (swapData: Hex) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateIncreaseLiquidityOptimalGas(
          chainId,
          amm,
          publicClient,
          from,
          position,
          increaseLiquidityParams,
          swapData,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.increaseLiquidityOptimalV2.EstimateGas.Error', {
        error: JSON.stringify((e as Error).message),
        swapData,
        increaseLiquidityParams,
      });
      return 0n;
    }
  };

  const solve = async (solver: E_Solver) => {
    let swapData: Hex = '0x';
    let swapRoute: SwapRoute | undefined = undefined;
    let liquidity: bigint = 0n;
    let amount0: bigint = increaseLiquidityParams.amount0Desired;
    let amount1: bigint = increaseLiquidityParams.amount1Desired;
    let gasFeeEstimation: bigint = 0n;

    try {
      const slippage = // numerator/denominator is more accurate than toSignificant()/100.
        Number(increaseOptions.slippageTolerance.numerator) /
        Number(increaseOptions.slippageTolerance.denominator);
      if (poolAmountIn > 0n) {
        ({ swapData, swapRoute } = await getSolver(solver).solve({
          chainId,
          amm,
          from,
          token0,
          token1,
          feeOrTickSpacing,
          tickLower,
          tickUpper,
          slippage,
          poolAmountIn,
          zeroForOne,
        }));
        [liquidity, amount0, amount1] = await simulateIncreaseLiquidityOptimal(
          chainId,
          amm,
          publicClient,
          from,
          position,
          increaseLiquidityParams,
          swapData,
          blockNumber,
        );
        gasFeeEstimation = await estimateGas(swapData);
      }

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
          amount0 - increaseLiquidityParams.amount0Desired,
          swapRoute,
        ),
        priceImpact: calcPriceImpact(
          position.pool,
          increaseLiquidityParams.amount0Desired,
          increaseLiquidityParams.amount1Desired,
          amount0,
          amount1,
        ),
        swapPath: getSwapPath(
          token0,
          token1,
          increaseLiquidityParams.amount0Desired,
          increaseLiquidityParams.amount1Desired,
          amount0,
          amount1,
          slippage,
        ),
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.increaseLiquidityOptimalV2.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        console.warn('SDK.Solver.increaseLiquidityOptimalV2.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}

// Same as increaseLiquidityOptimalV2, but with feeAmounts instead of feeBips.
export async function increaseLiquidityOptimalV3(
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
    deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
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
  const { poolAmountIn, zeroForOne } = await getOptimalSwapAmountV3(
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
  getLogger().info('SDK.increaseLiquidityOptimalV3.fees ', {
    amm,
    chainId,
    nftId: increaseOptions.tokenId,
    totalIncreaseLiquidityOptimalFeeUsd: feeUSD.toString(),
    token0PricesUsd: tokenPricesUsd[0],
    token1PricesUsd: tokenPricesUsd[1],
    token0FeeAmount,
    token1FeeAmount,
    amount0Desired: increaseLiquidityParams.amount0Desired.toString(),
    amount1Desired: increaseLiquidityParams.amount1Desired.toString(),
    zeroForOne,
    poolAmountIn: poolAmountIn.toString(), // before fees
    swapAmountIn: swapAmountIn.toString(), // after fees
  });

  const estimateGas = async (swapData: Hex) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateIncreaseLiquidityOptimalV3Gas(
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
      getLogger().error('SDK.increaseLiquidityOptimalV3.EstimateGas.Error', {
        error: JSON.stringify((e as Error).message),
        swapData,
        increaseLiquidityParams,
      });
      return 0n;
    }
  };

  const solve = async (solver: E_Solver) => {
    let swapData: Hex = '0x';
    let swapRoute: SwapRoute | undefined = undefined;
    let liquidity: bigint = 0n;
    let amount0: bigint = increaseLiquidityParams.amount0Desired;
    let amount1: bigint = increaseLiquidityParams.amount1Desired;
    let gasFeeEstimation: bigint = 0n;

    try {
      const slippage = // numerator/denominator is more accurate than toSignificant()/100.
        Number(increaseOptions.slippageTolerance.numerator) /
        Number(increaseOptions.slippageTolerance.denominator);
      if (swapAmountIn > 0n) {
        ({ swapData, swapRoute } = await getSolver(solver).solve({
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
        }));
        [liquidity, amount0, amount1] =
          await simulateIncreaseLiquidityOptimalV3(
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
      }

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
          amount0 - increaseLiquidityParams.amount0Desired,
          swapRoute,
        ),
        swapPath: getSwapPath(
          token0,
          token1,
          increaseLiquidityParams.amount0Desired,
          increaseLiquidityParams.amount1Desired,
          amount0,
          amount1,
          slippage,
        ),
        feeUSD: feeUSD.toFixed(),
        priceImpact: calcPriceImpact(
          position.pool,
          increaseLiquidityParams.amount0Desired,
          increaseLiquidityParams.amount1Desired,
          amount0,
          amount1,
        ),
        token0FeeAmount,
        token1FeeAmount,
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.increaseLiquidityOptimalV3.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        console.warn('SDK.Solver.increaseLiquidityOptimalV3.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}
