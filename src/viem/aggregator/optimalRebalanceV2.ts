import { ApertureSupportedChainId } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, PublicClient } from 'viem';

import {
  MintParams,
  estimateRebalanceGas,
  simulateRebalance,
  simulateRemoveLiquidity,
} from '../automan';
import { PositionDetails } from '../position';
import { ALL_SOLVERS, E_Solver, getSolver } from '../solver';
import {
  buildOptimalSolutions,
  calcPriceImpact,
  getOptimalSwapAmount,
  getSwapPath,
  getSwapRoute,
} from './internal';
import { SolverResult } from './types';

const feeRatio = 0.0007; // 0.07% fee
const feeCoefficient = 1e18;

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
export async function optimalRebalanceV2(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  position: PositionDetails,
  newTickLower: number,
  newTickUpper: number,
  fromAddress: Address,
  slippage: number,
  tokenPrices: [string, string],
  publicClient: PublicClient,
  blockNumber?: bigint,
  includeSolvers: E_Solver[] = ALL_SOLVERS,
  feesOn = true,
): Promise<SolverResult[]> {
  const token0 = position.token0.address as Address;
  const token1 = position.token1.address as Address;

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
      position.fee,
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
      await simulateAndGetOptimalSwapAmount(0n);

    const tokenInPrice = zeroForOne ? tokenPrices[0] : tokenPrices[1];

    const decimals = zeroForOne
      ? position.pool.token0.decimals
      : position.pool.token1.decimals;

    // swap token value * 0.0007 + 0.15
    const feeUSD = new Big(poolAmountIn.toString())
      .div(10 ** decimals)
      .mul(tokenInPrice)
      .mul(feeRatio)
      .add(0.15);

    const token0USD = new Big(receive0.toString())
      .mul(tokenPrices[0])
      .div(10 ** position.token0.decimals);

    const token1USD = new Big(receive1.toString())
      .mul(tokenPrices[1])
      .div(10 ** position.token1.decimals);

    const positionUSD = token0USD.add(token1USD);
    return {
      feeBips: BigInt(feeUSD.div(positionUSD).mul(feeCoefficient).toFixed(0)),
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
    console.warn('Error calculating fee', e);
    // TODO: logging to datadog
  }

  const { receive0, receive1, poolAmountIn, zeroForOne } =
    await simulateAndGetOptimalSwapAmount(feeBips);

  const mintParams: MintParams = {
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
      const { swapData, swapRoute } = await getSolver(solver).optimalMint({
        chainId,
        amm,
        fromAddress,
        mintParams,
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
          await estimateRebalanceGas(
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
        console.warn('Error estimating gas', e);
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
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Solver ${solver} failed: ${e}`);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}
