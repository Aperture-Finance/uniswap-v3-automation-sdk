import { ApertureSupportedChainId, getLogger } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, PublicClient } from 'viem';

import { DEFAULT_SOLVERS, E_Solver, getSolver } from '.';
import {
  SlipStreamMintParams,
  UniV3MintParams,
  estimateRebalanceGas,
  estimateRebalanceV3Gas,
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
import {
  buildOptimalSolutions,
  calcPriceImpact,
  getOptimalSwapAmount,
  getOptimalSwapAmountV3,
  getSwapPath,
  getSwapRoute,
} from './internal';
import { SolverResult } from './types';

/**
 * Get the optimal amount of liquidity to rebalance for a given position.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param position Position details
 * @param newTickLower The new lower tick.
 * @param newTickUpper The new upper tick.
 * @param feeBips The fee Aperture charge for the transaction.
 * @param fromAddress The address to rebalance from.
 * @param slippage The slippage tolerance.
 * @param publicClient Viem public client.
 * @param blockNumber Optional. The block number to use for the simulation.
 * @param includeSolvers Optional. The solvers to include.
 * @returns The optimal rebalance solutions.
 */
export async function rebalanceOptimalV2(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  position: PositionDetails,
  newTickLower: number,
  newTickUpper: number,
  fromAddress: Address,
  slippage: number,
  tokenPricesUsd: [string, string],
  publicClient: PublicClient,
  blockNumber?: bigint,
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  feesOn = true,
): Promise<SolverResult[]> {
  const token0 = position.token0.address as Address;
  const token1 = position.token1.address as Address;

  const logdata = {
    chainId,
    amm,
    position: position.tokenId,
    newTickLower,
    newTickUpper,
    fromAddress,
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
      fromAddress,
      position.owner,
      BigInt(position.tokenId),
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
        ? position.tickSpacing
        : position.fee,
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
      position.tokensOwed0,
      position.tokensOwed1,
      tokenPricesUsd,
    );
    const tokenInPrice = zeroForOne ? tokenPricesUsd[0] : tokenPricesUsd[1];

    const decimals = zeroForOne
      ? position.pool.token0.decimals
      : position.pool.token1.decimals;

    const token0Usd = new Big(receive0.toString())
      .mul(tokenPricesUsd[0])
      .div(10 ** position.token0.decimals);

    const token1Usd = new Big(receive1.toString())
      .mul(tokenPricesUsd[1])
      .div(10 ** position.token1.decimals);

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
      position.tokensOwed0.quotient.toString(),
    ).mul(getFeeReinvestRatio(position.fee));
    const token1ReinvestFeeAmount = new Big(
      position.tokensOwed1.quotient.toString(),
    ).mul(getFeeReinvestRatio(position.fee));
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
      .add(collectableTokenInUsd.mul(getFeeReinvestRatio(position.fee)))
      .add(FEE_REBALANCE_USD);
    const feeBips = BigInt(
      feeUSD.div(positionUsd).mul(MAX_FEE_PIPS).toFixed(0),
    );
    getLogger().info('rebalanceOptimalV2 fees', {
      totalRebalanceFeeUsd: feeUSD.toString(),
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
        .mul(getFeeReinvestRatio(position.fee))
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
          tickSpacing: position.tickSpacing,
          tickLower: newTickLower,
          tickUpper: newTickUpper,
          amount0Desired: receive0,
          amount1Desired: receive1,
          amount0Min: 0n, // Setting this to zero for tx simulation.
          amount1Min: 0n, // Setting this to zero for tx simulation.
          recipient: fromAddress, // Param value ignored by Automan for rebalance.
          deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
          sqrtPriceX96: 0n,
        }
      : {
          token0,
          token1,
          fee: position.fee,
          tickLower: newTickLower,
          tickUpper: newTickUpper,
          amount0Desired: receive0,
          amount1Desired: receive1,
          amount0Min: 0n, // Setting this to zero for tx simulation.
          amount1Min: 0n, // Setting this to zero for tx simulation.
          recipient: fromAddress, // Param value ignored by Automan for rebalance.
          deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
        };
  const solve = async (solver: E_Solver) => {
    try {
      const { swapData, swapRoute } = await getSolver(solver).mintOptimal({
        chainId,
        amm,
        fromAddress,
        token0,
        token1,
        feeOrTickSpacing:
          amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
            ? position.tickSpacing
            : position.fee,
        tickLower: newTickLower,
        tickUpper: newTickUpper,
        slippage,
        poolAmountIn,
        zeroForOne,
      });

      const [, liquidity, amount0, amount1] = await simulateRebalance(
        chainId,
        amm,
        publicClient,
        fromAddress,
        position.owner,
        mintParams,
        BigInt(position.tokenId),
        feeBips,
        swapData,
        blockNumber,
      );

      let gasFeeEstimation = 0n;
      try {
        const [gasPrice, gasAmount] = await Promise.all([
          publicClient.getGasPrice(),
          estimateRebalanceGas(
            chainId,
            amm,
            publicClient,
            fromAddress,
            position.owner,
            mintParams,
            BigInt(position.tokenId),
            feeBips,
            swapData,
            blockNumber,
          ),
        ]);
        gasFeeEstimation = gasPrice * gasAmount;
      } catch (e) {
        getLogger().error('SDK.rebalanceOptimalV2.EstimateGas.Error', {
          error: JSON.stringify(e),
          swapData,
          mintParams,
          ...logdata,
        });
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
          position.pool,
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

// Same as rebalanceOptimalV2, but with feeAmounts instead of feeBips.
// Do not use, but implemented to make it easier to migrate to future versions.
export async function rebalanceOptimalV3(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  position: PositionDetails,
  newTickLower: number,
  newTickUpper: number,
  fromAddress: Address,
  slippage: number,
  tokenPricesUsd: [string, string],
  publicClient: PublicClient,
  blockNumber?: bigint,
  includeSolvers: E_Solver[] = DEFAULT_SOLVERS,
  feesOn = true,
): Promise<SolverResult[]> {
  const token0 = position.token0.address as Address;
  const token1 = position.token1.address as Address;

  const logdata = {
    chainId,
    amm,
    position: position.tokenId,
    newTickLower,
    newTickUpper,
    fromAddress,
    slippage,
    tokenPricesUsd,
  };

  if (tokenPricesUsd[0] === '0' || tokenPricesUsd[1] === '0') {
    throw new Error('Invalid token prices.');
  }

  const simulateAndGetOptimalSwapAmount = async (
    token0FeeAmount: bigint,
    token1FeeAmount: bigint,
  ) => {
    const [receive0, receive1] = await simulateRemoveLiquidityV3(
      chainId,
      amm,
      publicClient,
      fromAddress,
      position.owner,
      BigInt(position.tokenId),
      /*amount0Min =*/ undefined,
      /*amount1Min =*/ undefined,
      token0FeeAmount,
      token1FeeAmount,
      blockNumber,
    );

    const { poolAmountIn, zeroForOne } = await getOptimalSwapAmountV3(
      chainId,
      amm,
      publicClient,
      token0,
      token1,
      amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
        ? position.tickSpacing
        : position.fee,
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

  const calcFeeAmount = async () => {
    const { poolAmountIn, zeroForOne, receive0, receive1 } =
      await simulateAndGetOptimalSwapAmount(
        /* token0FeeAmount= */ 0n,
        /* token1FeeAmount= */ 0n,
      );
    const collectableTokenInUsd = getTokensInUsd(
      position.tokensOwed0,
      position.tokensOwed1,
      tokenPricesUsd,
    );
    const tokenInPrice = zeroForOne ? tokenPricesUsd[0] : tokenPricesUsd[1];

    const decimals = zeroForOne
      ? position.pool.token0.decimals
      : position.pool.token1.decimals;

    const token0Usd = new Big(receive0.toString())
      .mul(tokenPricesUsd[0])
      .div(10 ** position.token0.decimals);

    const token1Usd = new Big(receive1.toString())
      .mul(tokenPricesUsd[1])
      .div(10 ** position.token1.decimals);

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
        token0FeeAmount: 0n,
        token1FeeAmount: 0n,
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
      position.tokensOwed0.quotient.toString(),
    ).mul(getFeeReinvestRatio(position.fee));
    const token1ReinvestFeeAmount = new Big(
      position.tokensOwed1.quotient.toString(),
    ).mul(getFeeReinvestRatio(position.fee));
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
      .add(collectableTokenInUsd.mul(getFeeReinvestRatio(position.fee)))
      .add(FEE_REBALANCE_USD);
    const feeBips = BigInt(
      feeUSD.div(positionUsd).mul(MAX_FEE_PIPS).toFixed(0),
    );
    getLogger().info('rebalanceOptimalV3 fees', {
      totalRebalanceFeeUsd: feeUSD.toString(),
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
        .mul(getFeeReinvestRatio(position.fee))
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
      token0FeeAmount: BigInt(token0FeeAmount.toFixed(0)),
      token1FeeAmount: BigInt(token1FeeAmount.toFixed(0)),
      feeUSD: feeUSD.toFixed(),
    };
  };

  let token0FeeAmount = 0n,
    token1FeeAmount = 0n,
    feeUSD = '0';
  try {
    if (feesOn) {
      ({ token0FeeAmount, token1FeeAmount, feeUSD } = await calcFeeAmount());
    }
  } catch (e) {
    getLogger().error('SDK.rebalanceOptimalV3.calcFeeAmount.Error', {
      error: JSON.stringify((e as Error).message),
      ...logdata,
    });
  }

  const { receive0, receive1, poolAmountIn, zeroForOne } =
    await simulateAndGetOptimalSwapAmount(token0FeeAmount, token1FeeAmount);

  const mintParams: SlipStreamMintParams | UniV3MintParams =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? {
          token0,
          token1,
          tickSpacing: position.tickSpacing,
          tickLower: newTickLower,
          tickUpper: newTickUpper,
          amount0Desired: receive0,
          amount1Desired: receive1,
          amount0Min: 0n, // Setting this to zero for tx simulation.
          amount1Min: 0n, // Setting this to zero for tx simulation.
          recipient: fromAddress, // Param value ignored by Automan for rebalance.
          deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
          sqrtPriceX96: 0n,
        }
      : {
          token0,
          token1,
          fee: position.fee,
          tickLower: newTickLower,
          tickUpper: newTickUpper,
          amount0Desired: receive0,
          amount1Desired: receive1,
          amount0Min: 0n, // Setting this to zero for tx simulation.
          amount1Min: 0n, // Setting this to zero for tx simulation.
          recipient: fromAddress, // Param value ignored by Automan for rebalance.
          deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
        };
  const solve = async (solver: E_Solver) => {
    try {
      const { swapData, swapRoute } = await getSolver(solver).mintOptimal({
        chainId,
        amm,
        fromAddress,
        token0,
        token1,
        feeOrTickSpacing:
          amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
            ? position.tickSpacing
            : position.fee,
        tickLower: newTickLower,
        tickUpper: newTickUpper,
        slippage,
        poolAmountIn,
        zeroForOne,
      });

      const [, liquidity, amount0, amount1] = await simulateRebalanceV3(
        chainId,
        amm,
        publicClient,
        fromAddress,
        position.owner,
        mintParams,
        BigInt(position.tokenId),
        token0FeeAmount,
        token1FeeAmount,
        swapData,
        blockNumber,
      );

      let gasFeeEstimation = 0n;
      try {
        const [gasPrice, gasAmount] = await Promise.all([
          publicClient.getGasPrice(),
          estimateRebalanceV3Gas(
            chainId,
            amm,
            publicClient,
            fromAddress,
            position.owner,
            mintParams,
            BigInt(position.tokenId),
            token0FeeAmount,
            token1FeeAmount,
            swapData,
            blockNumber,
          ),
        ]);
        gasFeeEstimation = gasPrice * gasAmount;
      } catch (e) {
        getLogger().error('SDK.rebalanceOptimalV3.EstimateGas.Error', {
          error: JSON.stringify(e),
          swapData,
          mintParams,
          ...logdata,
        });
      }

      return {
        solver,
        amount0,
        amount1,
        liquidity,
        swapData,
        token0FeeAmount,
        token1FeeAmount,
        feeUSD,
        gasFeeEstimation,
        swapRoute: getSwapRoute(
          token0,
          token1,
          BigInt(amount0 - receive0),
          swapRoute,
        ),
        priceImpact: calcPriceImpact(
          position.pool,
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
        getLogger().error('SDK.Solver.rebalanceOptimalV3.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        console.warn('SDK.Solver.rebalanceOptimalV3.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}
