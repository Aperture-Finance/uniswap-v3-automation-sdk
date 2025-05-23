import { ApertureSupportedChainId, getAMMInfo, getLogger } from '@/index';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import {
  DEFAULT_SOLVERS,
  E_Solver,
  SolverResult,
  SwapRoute,
  get1InchSwap,
  getIsOkx,
  getOkxSwap,
  getSolver,
} from '.';
import {
  FEE_ZAP_RATIO,
  SlipStreamMintParams,
  UniV3MintParams,
  encodeOptimalSwapData,
  estimateMintOptimalGas,
  estimateMintOptimalV3Gas,
  getAutomanContract,
  simulateMintOptimal,
  simulateMintOptimalV3,
} from '../automan';
import { getPool } from '../pool';
import { get1InchApproveTarget } from './get1InchSolver';
import { getOkxApproveTarget } from './getOkxSolver';
import {
  _getOptimalSwapAmount,
  buildOptimalSolutions,
  calcPriceImpact,
  getFeeOrTickSpacingFromMintParams,
  getOptimalSwapAmount,
  getOptimalSwapAmountV3,
  getSwapPath,
  getSwapRoute,
} from './internal';

/**
 * Get the optimal amount of liquidity to mint for a given pool and token amounts.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fee The pool fee tier.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param from The address to mint from.
 * @param slippage The slippage tolerance.
 * @param publicClient Viem public client.
 * @param usePool Whether to use the pool or the aggregator for the swap.
 */
export async function mintOptimal(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  feeOrTickSpacing: number,
  tickLower: number,
  tickUpper: number,
  from: Address,
  slippage: number,
  publicClient: PublicClient,
  usePool = false,
  includeSwapInfo?: boolean,
  blockNumber?: bigint,
): Promise<SolverResult> {
  if (!token0Amount.currency.sortsBefore(token1Amount.currency)) {
    throw new Error('token0 must be sorted before token1');
  }
  const mintParams: SlipStreamMintParams | UniV3MintParams =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? {
          token0: token0Amount.currency.address as Address,
          token1: token1Amount.currency.address as Address,
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
          token0: token0Amount.currency.address as Address,
          token1: token1Amount.currency.address as Address,
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

  const getEstimate = async () => {
    const { optimalSwapRouter } = getAMMInfo(chainId, amm)!;
    const poolPromise = mintOptimalPool(
      chainId,
      amm,
      publicClient,
      from,
      mintParams,
      blockNumber,
    );

    if (usePool || !optimalSwapRouter) {
      return await poolPromise;
    }

    const [poolEstimate, routerEstimate] = await Promise.all([
      poolPromise,
      mintOptimalRouter(chainId, amm, publicClient, from, mintParams, slippage),
    ]);
    // use the same pool if the quote isn't better
    if (poolEstimate.liquidity > routerEstimate.liquidity) {
      return poolEstimate;
    } else {
      return routerEstimate;
    }
  };

  const ret = await getEstimate();

  if (includeSwapInfo) {
    const pool = await getPool(
      mintParams.token0,
      mintParams.token1,
      feeOrTickSpacing,
      chainId,
      amm,
      publicClient,
      blockNumber,
    );

    ret.priceImpact = calcPriceImpact(
      pool,
      mintParams.amount0Desired,
      mintParams.amount1Desired,
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
      slippage,
    );
  }

  return ret;
}

async function mintOptimalPool(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  mintParams: SlipStreamMintParams | UniV3MintParams,
  blockNumber?: bigint,
): Promise<SolverResult> {
  const [, liquidity, amount0, amount1] = await simulateMintOptimal(
    chainId,
    amm,
    publicClient,
    from,
    mintParams,
    /* swapData= */ undefined,
    /* blockNumber= */ blockNumber,
  );
  let swapRoute: SwapRoute = [];
  if (mintParams.amount0Desired.toString() !== amount0.toString()) {
    const [fromTokenAddress, toTokenAddress] = new Big(
      mintParams.amount0Desired.toString(),
    ).gt(amount0.toString())
      ? [mintParams.token0, mintParams.token1]
      : [mintParams.token1, mintParams.token0];
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

async function mintOptimalRouter(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  mintParams: SlipStreamMintParams | UniV3MintParams,
  slippage: number,
): Promise<SolverResult> {
  const { solver, swapData, swapRoute } = await getMintOptimalSwapData(
    chainId,
    amm,
    publicClient,
    mintParams,
    slippage,
    /* includeRoute= */ true,
    /* blockNumber= */ undefined,
  );
  const [, liquidity, amount0, amount1] = await simulateMintOptimal(
    chainId,
    amm,
    publicClient,
    from,
    mintParams,
    swapData,
    undefined,
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

async function getMintOptimalSwapData(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  mintParams: SlipStreamMintParams | UniV3MintParams,
  slippage: number,
  includeRoute?: boolean,
  blockNumber?: bigint,
): Promise<{
  solver: E_Solver;
  swapData: Hex;
  swapRoute?: SwapRoute;
}> {
  try {
    const isOkx = getIsOkx();

    const { poolAmountIn, zeroForOne } = await _getOptimalSwapAmount(
      getAutomanContract,
      chainId,
      amm,
      publicClient,
      mintParams.token0,
      mintParams.token1,
      getFeeOrTickSpacingFromMintParams(amm, mintParams),
      mintParams.tickLower,
      mintParams.tickUpper,
      mintParams.amount0Desired,
      mintParams.amount1Desired,
      blockNumber,
    );

    const ammInfo = getAMMInfo(chainId, amm)!;
    const { tx, protocols } = await (isOkx
      ? getOkxSwap(
          chainId,
          zeroForOne ? mintParams.token0 : mintParams.token1,
          zeroForOne ? mintParams.token1 : mintParams.token0,
          poolAmountIn.toString(),
          ammInfo.optimalSwapRouter!,
          slippage,
        )
      : get1InchSwap(
          chainId,
          zeroForOne ? mintParams.token0 : mintParams.token1,
          zeroForOne ? mintParams.token1 : mintParams.token0,
          poolAmountIn.toString(),
          ammInfo.optimalSwapRouter!,
          slippage * 100,
          includeRoute,
        ));

    const approveTarget = await (isOkx
      ? getOkxApproveTarget(
          chainId,
          zeroForOne ? mintParams.token0 : mintParams.token1,
          poolAmountIn.toString(),
        )
      : get1InchApproveTarget(chainId));

    return {
      solver: isOkx ? E_Solver.OKX : E_Solver.OneInch,
      swapData: encodeOptimalSwapData(
        chainId,
        amm,
        mintParams.token0,
        mintParams.token1,
        getFeeOrTickSpacingFromMintParams(amm, mintParams),
        mintParams.tickLower,
        mintParams.tickUpper,
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
 * Get the optimal amount of liquidity to mint for a given pool and token amounts.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fee The pool fee tier.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param from The address to mint from.
 * @param slippage The slippage tolerance.
 * @param publicClient Viem public client.
 * @param blockNumber Optional. The block number to use for the simulation.
 * @param includeSolvers Optional. The solvers to include.
 */
export async function mintOptimalV2(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  feeOrTickSpacing: number,
  tickLower: number,
  tickUpper: number,
  from: Address,
  slippage: number,
  publicClient: PublicClient,
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  blockNumber?: bigint,
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

  const { poolAmountIn, zeroForOne } = await getOptimalSwapAmount(
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

  const estimateGas = async (swapData: Hex) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateMintOptimalGas(
          chainId,
          amm,
          publicClient,
          from,
          mintParams,
          swapData,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.mintOptimalV2.EstimateGas.Error', {
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
        [, liquidity, amount0, amount1] = await simulateMintOptimal(
          chainId,
          amm,
          publicClient,
          from,
          mintParams,
          swapData,
          blockNumber,
        );
        gasFeeEstimation = await estimateGas(swapData);
      }

      const pool = await getPool(
        token0,
        token1,
        feeOrTickSpacing,
        chainId,
        amm,
        publicClient,
        blockNumber,
      );

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
          pool,
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
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.mintOptimal2.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        console.warn('SDK.Solver.mintOptimalV2.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}

// Same as mintOptimalV2, but with feeAmounts instead of feeBips.
export async function mintOptimalV3(
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
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  blockNumber?: bigint,
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
  const { poolAmountIn, zeroForOne } = await getOptimalSwapAmountV3(
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

  getLogger().info('SDK.mintOptimalV3.Fees ', {
    amm,
    chainId,
    totalMintOptimalFeeUsd: feeUSD.toString(),
    token0PricesUsd: tokenPricesUsd[0],
    token1PricesUsd: tokenPricesUsd[1],
    token0FeeAmount,
    token1FeeAmount,
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
        estimateMintOptimalV3Gas(
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
      getLogger().error('SDK.mintOptimalV3.EstimateGas.Error', {
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
        [, liquidity, amount0, amount1] = await simulateMintOptimalV3(
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
        getLogger().error('SDK.Solver.mintOptimalV3.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
          mintParams,
        });
      } else {
        console.warn('SDK.Solver.mintOptimalV3.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}
