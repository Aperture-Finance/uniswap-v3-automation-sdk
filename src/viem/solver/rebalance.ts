import {
  ApertureSupportedChainId,
  GAS_LIMIT_L2_MULTIPLIER,
  getAMMInfo,
  getChainInfo,
  getLogger,
} from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { DEFAULT_SOLVERS, E_Solver, getSolver } from '.';
import {
  SlipStreamMintParams,
  UniV3MintParams,
  estimateRebalanceGas,
  estimateRebalanceV3Gas,
  getAutomanRebalanceCalldata,
  simulateRebalance,
  simulateRebalanceV3,
  simulateRemoveLiquidity,
  simulateRemoveLiquidityV3,
} from '../automan';
import {
  FEE_REBALANCE_SWAP_RATIO,
  FEE_REBALANCE_USD,
  MAX_FEE_PIPS,
  getFeeReinvestRatio,
  getTokensInUsd,
} from '../automan/getFees';
import { PositionDetails } from '../position';
import { estimateTotalGasCostForOptimismLikeL2Tx } from '../public_client';
import {
  buildOptimalSolutions,
  calcPriceImpact,
  getOptimalSwapAmount,
  getOptimalSwapAmountV3,
  getSwapPath,
  getSwapRoute,
  isOptimismLikeChain,
} from './internal';
import { SolverResult, SwapRoute } from './types';

/**
 * Get the optimal amount of liquidity to rebalance for a given position.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param positionDetails Position details
 * @param newTickLower The new lower tick.
 * @param newTickUpper The new upper tick.
 * @param feeBips The fee Aperture charge for the transaction.
 * @param from The address to rebalance from.
 * @param slippage The slippage tolerance.
 * @param publicClient Viem public client.
 * @param blockNumber Optional. The block number to use for the simulation.
 * @param includeSolvers Optional. The solvers to include.
 * @returns The optimal rebalance solutions.
 */
export async function rebalanceOptimalV2(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  positionDetails: PositionDetails,
  newTickLower: number,
  newTickUpper: number,
  from: Address,
  slippage: number,
  tokenPricesUsd: [string, string],
  publicClient: PublicClient,
  blockNumber?: bigint,
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  feesOn = true,
): Promise<SolverResult[]> {
  const tokenId = BigInt(positionDetails.tokenId);
  const token0 = positionDetails.token0.address as Address;
  const token1 = positionDetails.token1.address as Address;

  const logdata = {
    chainId,
    amm,
    position: positionDetails.tokenId,
    newTickLower,
    newTickUpper,
    from,
    slippage,
    tokenPricesUsd,
  };

  if (tokenPricesUsd[0] === '0' || tokenPricesUsd[1] === '0') {
    throw new Error('Invalid token prices.');
  }

  const simulateAndGetOptimalSwapAmount = async (feeBips: bigint) => {
    const [receive0, receive1] = await simulateRemoveLiquidity(
      chainId,
      amm,
      publicClient,
      from,
      positionDetails.owner,
      tokenId,
      /*amount0Min =*/ undefined,
      /*amount1Min =*/ undefined,
      feeBips,
      blockNumber,
    );

    const { poolAmountIn, zeroForOne } = await getOptimalSwapAmount(
      chainId,
      amm,
      publicClient,
      token0,
      token1,
      amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
        ? positionDetails.tickSpacing
        : positionDetails.fee,
      newTickLower,
      newTickUpper,
      receive0,
      receive1,
      blockNumber,
    );

    return {
      receive0,
      receive1,
      poolAmountIn,
      zeroForOne,
    };
  };

  const calcFeeBips = async () => {
    const { poolAmountIn, zeroForOne, receive0, receive1 } =
      await simulateAndGetOptimalSwapAmount(/* feeBips= */ 0n);
    const collectableTokenInUsd = getTokensInUsd(
      positionDetails.tokensOwed0,
      positionDetails.tokensOwed1,
      tokenPricesUsd,
    );
    const tokenInPrice = zeroForOne ? tokenPricesUsd[0] : tokenPricesUsd[1];
    const decimals = zeroForOne
      ? positionDetails.pool.token0.decimals
      : positionDetails.pool.token1.decimals;
    const token0Usd = new Big(receive0.toString())
      .mul(tokenPricesUsd[0])
      .div(10 ** positionDetails.token0.decimals);
    const token1Usd = new Big(receive1.toString())
      .mul(tokenPricesUsd[1])
      .div(10 ** positionDetails.token1.decimals);
    const positionUsd = token0Usd.add(token1Usd);
    if (positionUsd.eq(0)) {
      getLogger().error('Invalid position USD value', {
        poolAmountIn,
        zeroForOne,
        receive0,
        receive1,
        token0Usd: token0Usd.toString(),
        token1Usd: token1Usd.toString(),
        ...logdata,
      });

      return {
        feeBips: 0n,
        feeUSD: '0',
      };
    }

    // swapTokenValue * FEE_REBALANCE_SWAP_RATIO + lpCollectedFees * getFeeReinvestRatio(pool.fee) + FEE_REBALANCE_USD
    const tokenInSwapFeeAmount = new Big(poolAmountIn.toString()).mul(
      FEE_REBALANCE_SWAP_RATIO,
    );
    const token0SwapFeeAmount = zeroForOne
      ? tokenInSwapFeeAmount
      : new Big('0');
    const token1SwapFeeAmount = zeroForOne
      ? new Big('0')
      : tokenInSwapFeeAmount;
    const token0ReinvestFeeAmount = new Big(
      positionDetails.tokensOwed0.quotient.toString(),
    ).mul(getFeeReinvestRatio(positionDetails.fee));
    const token1ReinvestFeeAmount = new Big(
      positionDetails.tokensOwed1.quotient.toString(),
    ).mul(getFeeReinvestRatio(positionDetails.fee));
    const rebalanceFlatFeePips = new Big(FEE_REBALANCE_USD)
      .div(positionUsd)
      .mul(MAX_FEE_PIPS)
      .toFixed(0);
    const token0RebalanceFlatFeeAmount = new Big(receive0.toString())
      .mul(rebalanceFlatFeePips)
      .div(MAX_FEE_PIPS);
    const token1RebalanceFlatFeeAmount = new Big(receive1.toString())
      .mul(rebalanceFlatFeePips)
      .div(MAX_FEE_PIPS);
    const token0FeeAmount = token0SwapFeeAmount
      .add(token0ReinvestFeeAmount)
      .add(token0RebalanceFlatFeeAmount);
    const token1FeeAmount = token1SwapFeeAmount
      .add(token1ReinvestFeeAmount)
      .add(token1RebalanceFlatFeeAmount);

    const feeUSD = new Big(poolAmountIn.toString())
      .div(10 ** decimals)
      .mul(tokenInPrice)
      .mul(FEE_REBALANCE_SWAP_RATIO)
      .add(collectableTokenInUsd.mul(getFeeReinvestRatio(positionDetails.fee)))
      .add(FEE_REBALANCE_USD);
    // positionUsd includes feesCollected and so does feeBips
    const feeBips = BigInt(
      feeUSD.div(positionUsd).mul(MAX_FEE_PIPS).toFixed(0),
    );
    getLogger().info('SDK.rebalanceOptimalV2.Fees', {
      feeUSD: feeUSD.toString(),
      token0FeeAmount: token0FeeAmount.toString(),
      token1FeeAmount: token1FeeAmount.toString(),
      feeOnRebalanceSwapUsd: new Big(poolAmountIn.toString())
        .div(10 ** decimals)
        .mul(tokenInPrice)
        .mul(FEE_REBALANCE_SWAP_RATIO)
        .toString(),
      tokenInSwapFeeAmount: tokenInSwapFeeAmount.toString(),
      token0SwapFeeAmount: token0SwapFeeAmount.toString(),
      token1SwapFeeAmount: token1SwapFeeAmount.toString(),
      feeOnRebalanceReinvestUsd: collectableTokenInUsd
        .mul(getFeeReinvestRatio(positionDetails.fee))
        .toString(),
      token0ReinvestFeeAmount: token0ReinvestFeeAmount.toString(),
      token1ReinvestFeeAmount: token1ReinvestFeeAmount.toString(),
      rebalanceFlatFeePips,
      feeOnRebalanceFlatUsd: FEE_REBALANCE_USD,
      token0RebalanceFlatFeeAmount: token0RebalanceFlatFeeAmount.toString(),
      token1RebalanceFlatFeeAmount: token1RebalanceFlatFeeAmount.toString(),
      feeBips,
      poolAmountIn,
      tokenInPrice,
      collectableTokenInUsd: collectableTokenInUsd.toString(),
      token0Price: tokenPricesUsd[0],
      token1Price: tokenPricesUsd[1],
      token0Usd: token0Usd.toString(),
      token1Usd: token1Usd.toString(),
      positionUsd: positionUsd.toString(),
      ...logdata,
    });

    return {
      feeBips,
      feeUSD: feeUSD.toFixed(5),
    };
  };

  let feeBips = 0n,
    feeUSD = '0';
  try {
    if (feesOn) {
      ({ feeBips, feeUSD } = await calcFeeBips());
    }
  } catch (e) {
    getLogger().error('SDK.rebalanceOptimalV2.calcFeeBips.Error', {
      error: JSON.stringify((e as Error).message),
      ...logdata,
    });
  }

  const { receive0, receive1, poolAmountIn, zeroForOne } =
    await simulateAndGetOptimalSwapAmount(feeBips);

  const mintParams: SlipStreamMintParams | UniV3MintParams =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? {
          token0,
          token1,
          tickSpacing: positionDetails.tickSpacing,
          tickLower: newTickLower,
          tickUpper: newTickUpper,
          amount0Desired: receive0,
          amount1Desired: receive1,
          amount0Min: 0n, // 0 for simulation and estimating gas.
          amount1Min: 0n,
          recipient: positionDetails.owner, // Param value ignored by Automan for rebalance.
          deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
          sqrtPriceX96: 0n,
        }
      : {
          token0,
          token1,
          fee: positionDetails.fee,
          tickLower: newTickLower,
          tickUpper: newTickUpper,
          amount0Desired: receive0,
          amount1Desired: receive1,
          amount0Min: 0n, // 0 for simulation and estimating gas.
          amount1Min: 0n,
          recipient: positionDetails.owner, // Param value ignored by Automan for rebalance.
          deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
        };

  const estimateGas = async (swapData: Hex) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateRebalanceGas(
          chainId,
          amm,
          publicClient,
          from,
          positionDetails.owner,
          mintParams,
          tokenId,
          feeBips,
          swapData,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.rebalanceOptimalV2.EstimateGas.Error', {
        error: JSON.stringify(e),
        swapData,
        mintParams,
        ...logdata,
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
          feeOrTickSpacing:
            amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
              ? positionDetails.tickSpacing
              : positionDetails.fee,
          tickLower: newTickLower,
          tickUpper: newTickUpper,
          slippage,
          poolAmountIn,
          zeroForOne,
        }));
        [, liquidity, amount0, amount1] = await simulateRebalance(
          chainId,
          amm,
          publicClient,
          from,
          positionDetails.owner,
          mintParams,
          tokenId,
          feeBips,
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
        feeBips,
        feeUSD,
        gasFeeEstimation,
        swapRoute: getSwapRoute(token0, token1, amount0 - receive0, swapRoute),
        priceImpact: calcPriceImpact(
          positionDetails.pool,
          receive0,
          receive1,
          amount0,
          amount1,
        ),
        swapPath: getSwapPath(
          token0,
          token1,
          receive0,
          receive1,
          amount0,
          amount1,
          slippage,
        ),
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.rebalanceOptimalV2.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        console.warn('SDK.Solver.rebalanceOptimalV2.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}

// Used for backend.
export async function rebalanceBackend(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  positionDetails: PositionDetails,
  newTickLower: number,
  newTickUpper: number,
  slippage: number,
  tokenPricesUsd: [string, string],
  nativeToUsd: string,
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  blockNumber?: bigint,
): Promise<SolverResult[]> {
  const tokenId = BigInt(positionDetails.tokenId);
  const token0 = positionDetails.token0;
  const token1 = positionDetails.token1;
  const feeOrTickSpacing =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? positionDetails.tickSpacing
      : positionDetails.fee;
  if ([tokenPricesUsd[0], tokenPricesUsd[1], nativeToUsd].includes('0')) {
    throw new Error('Invalid token prices.');
  }

  const logdata = {
    chainId,
    amm,
    from,
    tokenId,
    newTickLower,
    newTickUpper,
    slippage,
    tokenPricesUsd,
  };

  const [receive0, receive1] = await simulateRemoveLiquidity(
    chainId,
    amm,
    publicClient,
    from,
    positionDetails.owner,
    tokenId,
    /* amount0Min= */ undefined,
    /* amount1Min= */ undefined,
    /* feeBips= */ 0n,
    blockNumber,
  );

  const { poolAmountIn, zeroForOne } = await getOptimalSwapAmount(
    chainId,
    amm,
    publicClient,
    token0.address as Address,
    token1.address as Address,
    feeOrTickSpacing,
    newTickLower,
    newTickUpper,
    /* amount0Desired= */ receive0,
    /* amount1Desired= */ receive1,
    blockNumber,
  );

  // rebalanceFees =
  // swapFees + reinvestFees + flatFees
  // swapTokenValue * FEE_REBALANCE_SWAP_RATIO + lpCollectedFees * getFeeReinvestRatio(pool.fee) + FEE_REBALANCE_USD
  const tokenInUsd = zeroForOne ? tokenPricesUsd[0] : tokenPricesUsd[1];
  const tokenInDecimals = zeroForOne ? token0.decimals : token1.decimals;
  const swapFeeAmount = BigInt(
    new Big(poolAmountIn.toString()).mul(FEE_REBALANCE_SWAP_RATIO).toFixed(0),
  );
  const swapFeesUsd = new Big(swapFeeAmount.toString())
    .div(10 ** tokenInDecimals)
    .mul(tokenInUsd);
  const reinvestToken0FeeAmount = BigInt(
    new Big(positionDetails.tokensOwed0.quotient.toString())
      .mul(getFeeReinvestRatio(positionDetails.fee))
      .toFixed(0),
  );
  const reinvestToken1FeeAmount = BigInt(
    new Big(positionDetails.tokensOwed1.quotient.toString())
      .mul(getFeeReinvestRatio(positionDetails.fee))
      .toFixed(0),
  );
  const reinvestFeeUSD = new Big(reinvestToken0FeeAmount.toString())
    .div(10 ** token0.decimals)
    .mul(tokenPricesUsd[0])
    .add(
      new Big(reinvestToken1FeeAmount.toString())
        .div(10 ** token1.decimals)
        .mul(tokenPricesUsd[1]),
    );
  const flatFeeUsd = FEE_REBALANCE_USD;
  let feeUSD = swapFeesUsd.add(reinvestFeeUSD).add(flatFeeUsd);
  // Get position without feesCollected because that's how automanV1 uses feePips.
  const [token0Position, token1Position] = [
    new Big(positionDetails.position.amount0.quotient.toString()),
    new Big(positionDetails.position.amount1.quotient.toString()),
  ];
  const token0Usd = token0Position
    .mul(tokenPricesUsd[0])
    .div(10 ** positionDetails.token0.decimals);
  const token1Usd = token1Position
    .mul(tokenPricesUsd[1])
    .div(10 ** positionDetails.token1.decimals);
  const positionUsd = token0Usd.add(token1Usd);
  const positionRawNative = positionUsd
    .mul(10 ** getChainInfo(chainId).wrappedNativeCurrency.decimals)
    .div(nativeToUsd);
  const feeBips = BigInt(feeUSD.div(positionUsd).mul(MAX_FEE_PIPS).toFixed(0));
  let token0FeeAmount = BigInt(
    token0Position.mul(feeBips.toString()).div(MAX_FEE_PIPS).toFixed(0),
  );
  let token1FeeAmount = BigInt(
    token1Position.mul(feeBips.toString()).div(MAX_FEE_PIPS).toFixed(0),
  );
  let swapAmountIn =
    poolAmountIn - (zeroForOne ? token0FeeAmount : token1FeeAmount);

  getLogger().info('SDK.rebalanceBackend.round1.fees ', {
    ...logdata,
    rebalanceFeeUsd: feeUSD.toString(),
    swapFeesUsd: swapFeesUsd.toString(),
    reinvestFeeUSD: reinvestFeeUSD.toString(),
    flatFeeUsd,
    tokensOwed0: positionDetails.tokensOwed0.quotient.toString(),
    tokensOwed1: positionDetails.tokensOwed1.quotient.toString(),
    token0PricesUsd: tokenPricesUsd[0],
    token1PricesUsd: tokenPricesUsd[1],
    nativeToUsd,
    token0FeeAmount,
    token1FeeAmount,
    zeroForOne,
    poolAmountIn, // before fees
    swapAmountIn, // after apertureFees, but before gasReimbursementFees
    positionUsd: positionUsd.toString(), // without feesCollected of the position
    positionRawNative: positionRawNative.toString(), // without feesCollected of the position
    feeBips,
  });

  const mintParams: SlipStreamMintParams | UniV3MintParams =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? {
          token0: token0.address as Address,
          token1: token1.address as Address,
          tickSpacing: feeOrTickSpacing,
          tickLower: newTickLower,
          tickUpper: newTickUpper,
          amount0Desired: 0n, // amountsDesired not used in Automan.
          amount1Desired: 0n,
          amount0Min: 0n, // 0 for simulation and estimating gas.
          amount1Min: 0n,
          recipient: positionDetails.owner, // Param value ignored by Automan for rebalance.
          deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
          sqrtPriceX96: 0n,
        }
      : {
          token0: token0.address as Address,
          token1: token1.address as Address,
          fee: feeOrTickSpacing,
          tickLower: newTickLower,
          tickUpper: newTickUpper,
          amount0Desired: 0n, // amountsDesired not used in Automan.
          amount1Desired: 0n,
          amount0Min: 0n, // 0 for simulation and estimating gas.
          amount1Min: 0n,
          recipient: positionDetails.owner, // Param value ignored by Automan for rebalance.
          deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
        };

  const estimateGasInRawNaive = async (swapData: Hex) => {
    try {
      const [gasPriceInWei, gasUnits] = await Promise.all([
        publicClient.getGasPrice(),
        estimateRebalanceGas(
          chainId,
          amm,
          publicClient,
          from,
          positionDetails.owner,
          mintParams,
          tokenId,
          feeBips,
          swapData,
          blockNumber,
        ),
      ]);
      if (!isOptimismLikeChain(chainId)) {
        return {
          gasUnits,
          gasInRawNative: gasPriceInWei * gasUnits,
        };
      }
      // Optimism-like chains (Optimism, Base, and Scroll) charge additional gas for rollup to L1, so we query the gas oracle contract to estimate the L1 gas cost in addition to the regular L2 gas cost.
      const estimatedTotalGas = await estimateTotalGasCostForOptimismLikeL2Tx(
        {
          from,
          to: getAMMInfo(chainId, amm)!.apertureAutoman,
          data: getAutomanRebalanceCalldata(
            amm,
            mintParams,
            tokenId,
            feeBips,
            swapData,
            /* permitInfo= */ undefined,
          ),
        },
        chainId,
        publicClient,
      );
      // Scale the estimated gas by 1.5 as L1 gas could be at most 50% higher than the estimated gas.
      // We apply the scaling factor to the L2 gas portion as well because I find the estimated gas price is often lower than the actual price.
      // See https://community.optimism.io/docs/developers/build/transaction-fees/#the-l1-data-fee.
      return {
        gasUnits,
        gasInRawNative:
          (estimatedTotalGas.totalGasCost * BigInt(GAS_LIMIT_L2_MULTIPLIER)) /
          100n,
      };
    } catch (e) {
      getLogger().error(
        'SDK.Solver.rebalanceBackend.estimateGasInRawNaive.Error',
        {
          error: JSON.stringify((e as Error).message),
        },
      );

      // Throw errors, because failing to estimate gas will fail to reimburse relayer for gas.
      throw e;
    }
  };

  const solve = async (solver: E_Solver) => {
    let swapData: Hex = '0x';
    let swapRoute: SwapRoute | undefined = undefined;
    let liquidity: bigint = 0n;
    let amount0: bigint = 0n;
    let amount1: bigint = 0n;
    let gasUnits: bigint = 0n;
    let gasInRawNative: bigint = 0n;

    try {
      if (swapAmountIn > 0n) {
        ({ swapData, swapRoute } = await getSolver(solver).solve({
          chainId,
          amm,
          from,
          token0: token0.address as Address,
          token1: token1.address as Address,
          feeOrTickSpacing,
          tickLower: newTickLower,
          tickUpper: newTickUpper,
          slippage,
          poolAmountIn: swapAmountIn,
          zeroForOne,
          client: publicClient,
        }));

        getLogger().info('SDK.rebalanceBackend.round1.swapData', {
          solver,
          swapData,
        });
      }

      ({ gasUnits, gasInRawNative } = await estimateGasInRawNaive(swapData));
      getLogger().info('SDK.rebalanceBackend.round1.gas', {
        solver,
        gasUnits,
        gasInRawNative,
      });

      // Ethereum L1: 25% gas deduction boost.
      // L2s and all other L1s: 50% gas deduction boost.
      const gasBoostMultiplier =
        chainId === ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID
          ? 125
          : 150;
      const gasDeductionPips = BigInt(
        new Big(MAX_FEE_PIPS)
          .mul(gasBoostMultiplier)
          .div(100)
          .mul(gasInRawNative.toString())
          .div(positionRawNative)
          .toFixed(0),
      );
      const totalFeePips = feeBips + gasDeductionPips;
      token0FeeAmount = BigInt(
        new Big(token0Position)
          .mul(totalFeePips.toString())
          .div(MAX_FEE_PIPS)
          .toFixed(0),
      );
      token1FeeAmount = BigInt(
        new Big(token1Position)
          .mul(totalFeePips.toString())
          .div(MAX_FEE_PIPS)
          .toFixed(0),
      );
      swapAmountIn =
        poolAmountIn - (zeroForOne ? token0FeeAmount : token1FeeAmount);
      feeUSD = new Big(token0FeeAmount.toString())
        .div(10 ** token0.decimals)
        .mul(tokenPricesUsd[0])
        .add(
          new Big(token1FeeAmount.toString())
            .div(10 ** token1.decimals)
            .mul(tokenPricesUsd[1]),
        );

      getLogger().info('SDK.rebalanceBackend.round2.fees ', {
        solver,
        ...logdata,
        feeUSD: feeUSD.toString(),
        token0FeeAmount,
        token1FeeAmount,
        swapAmountIn, // after fees (both apertureFees and gasReimbursementFees)
        aptrFeeBips: feeBips,
        gasUnits,
        gasInRawNative,
        gasDeductionPips,
        totalFeePips,
      });

      if (swapAmountIn > 0n) {
        ({ swapData, swapRoute } = await getSolver(solver).solve({
          chainId,
          amm,
          from,
          token0: token0.address as Address,
          token1: token1.address as Address,
          feeOrTickSpacing,
          tickLower: newTickLower,
          tickUpper: newTickUpper,
          slippage,
          poolAmountIn: swapAmountIn,
          zeroForOne,
          client: publicClient,
        }));
      } else {
        // Clear prior swapData and swapRoute if no swapAmountIn after accounting for gas reimbursements.
        swapData = '0x';
        swapRoute = undefined;
      }

      [, liquidity, amount0, amount1] = await simulateRebalance(
        chainId,
        amm,
        publicClient,
        from,
        positionDetails.owner,
        mintParams,
        tokenId,
        totalFeePips,
        swapData,
        blockNumber,
      );
      return {
        solver,
        amount0,
        amount1,
        liquidity,
        swapData,
        feeBips: totalFeePips,
        feeUSD: feeUSD.toString(),
        gasUnits,
        gasFeeEstimation: gasInRawNative,
        swapRoute: getSwapRoute(
          token0.address as Address,
          token1.address as Address,
          amount0 - receive0,
          swapRoute,
        ),
        priceImpact: calcPriceImpact(
          positionDetails.pool,
          receive0,
          receive1,
          amount0,
          amount1,
        ),
        swapPath: getSwapPath(
          token0.address as Address,
          token1.address as Address,
          receive0,
          receive1,
          amount0,
          amount1,
          slippage,
        ),
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.rebalanceBackend.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        console.warn('SDK.Solver.rebalanceBackend.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}

// Same as rebalanceOptimalV2, but with feeAmounts instead of feeBips.
// Do not use, but implemented to make it easier to migrate to future versions.
export async function rebalanceV3(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  positionDetails: PositionDetails,
  newTickLower: number,
  newTickUpper: number,
  slippage: number,
  tokenPricesUsd: [string, string],
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  blockNumber?: bigint,
): Promise<SolverResult[]> {
  const tokenId = BigInt(positionDetails.tokenId);
  const token0 = positionDetails.token0;
  const token1 = positionDetails.token1;
  const feeOrTickSpacing =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? positionDetails.tickSpacing
      : positionDetails.fee;
  if (tokenPricesUsd[0] === '0' || tokenPricesUsd[1] === '0') {
    throw new Error('Invalid token prices.');
  }

  const logdata = {
    chainId,
    amm,
    tokenId,
    newTickLower,
    newTickUpper,
    from,
    slippage,
    tokenPricesUsd,
  };

  const [receive0, receive1] = await simulateRemoveLiquidityV3(
    chainId,
    amm,
    publicClient,
    from,
    positionDetails.owner,
    tokenId,
    /* amount0Min= */ 0n,
    /* amount1Min= */ 0n,
    /* token0FeeAmount= */ 0n,
    /* token1FeeAmount= */ 0n,
    blockNumber,
  );

  const { poolAmountIn, zeroForOne } = await getOptimalSwapAmountV3(
    chainId,
    amm,
    publicClient,
    token0.address as Address,
    token1.address as Address,
    feeOrTickSpacing,
    newTickLower,
    newTickUpper,
    receive0,
    receive1,
    blockNumber,
  );

  // rebalanceFees =
  // swapFees + reinvestFees + flatFees
  // swapTokenValue * FEE_REBALANCE_SWAP_RATIO + lpCollectedFees * getFeeReinvestRatio(pool.fee) + FEE_REBALANCE_USD
  const tokenInUsd = zeroForOne ? tokenPricesUsd[0] : tokenPricesUsd[1];
  const tokenInDecimals = zeroForOne ? token0.decimals : token1.decimals;
  const swapFeeAmount = BigInt(
    new Big(poolAmountIn.toString()).mul(FEE_REBALANCE_SWAP_RATIO).toFixed(0),
  );
  const swapFeesUsd = new Big(swapFeeAmount.toString())
    .div(10 ** tokenInDecimals)
    .mul(tokenInUsd);
  const reinvestToken0FeeAmount = BigInt(
    new Big(positionDetails.tokensOwed0.quotient.toString())
      .mul(getFeeReinvestRatio(positionDetails.fee))
      .toFixed(0),
  );
  const reinvestToken1FeeAmount = BigInt(
    new Big(positionDetails.tokensOwed0.quotient.toString())
      .mul(getFeeReinvestRatio(positionDetails.fee))
      .toFixed(0),
  );
  const reinvestFeeUSD = new Big(reinvestToken0FeeAmount.toString())
    .div(10 ** token0.decimals)
    .mul(tokenPricesUsd[0])
    .add(
      new Big(reinvestToken1FeeAmount.toString())
        .div(10 ** token1.decimals)
        .mul(tokenPricesUsd[1]),
    );
  const flatFeeUsd = FEE_REBALANCE_USD;
  const feeUSD = swapFeesUsd.add(reinvestFeeUSD).add(flatFeeUsd);
  // Get position without feesCollected because that's how automanV1 uses feePips.
  const [token0Position, token1Position] = [
    new Big(positionDetails.position.amount0.quotient.toString()),
    new Big(positionDetails.position.amount1.quotient.toString()),
  ];
  const token0Usd = token0Position
    .mul(tokenPricesUsd[0])
    .div(10 ** positionDetails.token0.decimals);
  const token1Usd = token1Position
    .mul(tokenPricesUsd[1])
    .div(10 ** positionDetails.token1.decimals);
  const positionUsd = token0Usd.add(token1Usd);
  const feeBips = BigInt(feeUSD.div(positionUsd).mul(MAX_FEE_PIPS).toFixed(0));
  const token0FeeAmount = BigInt(
    token0Position.mul(feeBips.toString()).div(MAX_FEE_PIPS).toFixed(0),
  );
  const token1FeeAmount = BigInt(
    token1Position.mul(feeBips.toString()).div(MAX_FEE_PIPS).toFixed(0),
  );
  const swapAmountIn =
    poolAmountIn - (zeroForOne ? token0FeeAmount : token1FeeAmount);

  getLogger().info('SDK.rebalanceV3.fees ', {
    ...logdata,
    rebalanceFeeUsd: feeUSD.toString(),
    swapFeesUsd: swapFeesUsd.toString(),
    reinvestFeeUSD: reinvestFeeUSD.toString(),
    flatFeeUsd,
    tokensOwed0: positionDetails.tokensOwed0.quotient.toString(),
    tokensOwed1: positionDetails.tokensOwed1.quotient.toString(),
    token0PricesUsd: tokenPricesUsd[0],
    token1PricesUsd: tokenPricesUsd[1],
    token0FeeAmount,
    token1FeeAmount,
    zeroForOne,
    poolAmountIn, // before fees
    swapAmountIn, // after apertureFees, but before gasReimbursementFees
    positionUsd: positionUsd.toString(), // without feesCollected of the position
    feeBips,
  });

  const mintParams: SlipStreamMintParams | UniV3MintParams =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? {
          token0: token0.address as Address,
          token1: token1.address as Address,
          tickSpacing: feeOrTickSpacing,
          tickLower: newTickLower,
          tickUpper: newTickUpper,
          amount0Desired: 0n, // amountsDesired not used in Automan.
          amount1Desired: 0n,
          amount0Min: 0n, // 0 for simulation and estimating gas.
          amount1Min: 0n,
          recipient: positionDetails.owner, // Param value ignored by Automan for rebalance.
          deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
          sqrtPriceX96: 0n,
        }
      : {
          token0: token0.address as Address,
          token1: token1.address as Address,
          fee: feeOrTickSpacing,
          tickLower: newTickLower,
          tickUpper: newTickUpper,
          amount0Desired: 0n, // amountsDesired not used in Automan.
          amount1Desired: 0n,
          amount0Min: 0n, // 0 for simulation and estimating gas.
          amount1Min: 0n,
          recipient: positionDetails.owner, // Param value ignored by Automan for rebalance.
          deadline: BigInt(Math.floor(Date.now() / 1000 + 24 * 60 * 60)),
        };

  const estimateGas = async (swapData: Hex) => {
    try {
      const [gasPrice, gasAmount] = await Promise.all([
        publicClient.getGasPrice(),
        estimateRebalanceV3Gas(
          chainId,
          amm,
          publicClient,
          from,
          positionDetails.owner,
          mintParams,
          tokenId,
          token0FeeAmount,
          token1FeeAmount,
          swapData,
          blockNumber,
        ),
      ]);
      return gasPrice * gasAmount;
    } catch (e) {
      getLogger().error('SDK.rebalanceV3.EstimateGas.Error', {
        error: JSON.stringify(e),
        swapData,
        mintParams,
        ...logdata,
      });
      return 0n;
    }
  };

  const solve = async (solver: E_Solver) => {
    let swapData: Hex = '0x';
    let swapRoute: SwapRoute | undefined = undefined;
    let liquidity: bigint = 0n;
    let amount0: bigint = 0n;
    let amount1: bigint = 0n;
    let gasFeeEstimation: bigint = 0n;

    try {
      if (swapAmountIn > 0n) {
        ({ swapData, swapRoute } = await getSolver(solver).solve({
          chainId,
          amm,
          from,
          token0: token0.address as Address,
          token1: token1.address as Address,
          feeOrTickSpacing:
            amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
              ? positionDetails.tickSpacing
              : positionDetails.fee,
          tickLower: newTickLower,
          tickUpper: newTickUpper,
          slippage,
          poolAmountIn: swapAmountIn,
          zeroForOne,
        }));
      }
      [, liquidity, amount0, amount1] = await simulateRebalanceV3(
        chainId,
        amm,
        publicClient,
        from,
        positionDetails.owner,
        mintParams,
        tokenId,
        token0FeeAmount,
        token1FeeAmount,
        swapData,
        blockNumber,
      );
      gasFeeEstimation = await estimateGas(swapData);

      return {
        solver,
        amount0,
        amount1,
        liquidity,
        swapData,
        token0FeeAmount,
        token1FeeAmount,
        feeUSD: feeUSD.toString(),
        gasFeeEstimation,
        swapRoute: getSwapRoute(
          token0.address as Address,
          token1.address as Address,
          BigInt(amount0 - receive0),
          swapRoute,
        ),
        priceImpact: calcPriceImpact(
          positionDetails.pool,
          receive0,
          receive1,
          amount0,
          amount1,
        ),
        swapPath: getSwapPath(
          token0.address as Address,
          token1.address as Address,
          receive0,
          receive1,
          amount0,
          amount1,
          slippage,
        ),
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.rebalanceV3.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        console.warn('SDK.Solver.rebalanceV3.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}
