import { ApertureSupportedChainId, computePoolAddress } from '@/index';
import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

import {
  MintParams,
  getAutomanContract,
  simulateRebalance,
  simulateRemoveLiquidity,
} from '../automan';
import { PositionDetails } from '../position';
import { ALL_SOLVERS, E_Solver, SwapRoute, getSolver } from '../solver';
import { calcPriceImpact, getSwapPath } from './internal';
import { SolverResult } from './types';

export async function optimalRebalanceV2(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  positionId: bigint,
  newTickLower: number,
  newTickUpper: number,
  feeBips: bigint,
  fromAddress: Address,
  slippage: number,
  publicClient: PublicClient,
  blockNumber?: bigint,
  excludeSolvers: E_Solver[] = [],
): Promise<SolverResult[]> {
  const position = await PositionDetails.fromPositionId(
    chainId,
    amm,
    positionId,
    publicClient,
    blockNumber,
  );

  const prepareSolve = async () => {
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

    const mintParams: MintParams = {
      token0: position.token0.address as Address,
      token1: position.token1.address as Address,
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

    const automan = getAutomanContract(chainId, amm, publicClient);
    // get swap amounts using the same pool
    const [poolAmountIn, , zeroForOne] = await automan.read.getOptimalSwap(
      [
        computePoolAddress(
          chainId,
          amm,
          mintParams.token0,
          mintParams.token1,
          mintParams.fee as FeeAmount,
        ),
        mintParams.tickLower,
        mintParams.tickUpper,
        mintParams.amount0Desired,
        mintParams.amount1Desired,
      ],
      {
        blockNumber,
      },
    );

    return {
      mintParams,
      poolAmountIn,
      zeroForOne,
    };
  };
  const { mintParams, poolAmountIn, zeroForOne } = await prepareSolve();

  const solve = async (solver: E_Solver) => {
    try {
      const { swapData, swapRoute } = await getSolver(solver).optimalMint({
        chainId,
        amm,
        fromAddress,
        mintParams,
        slippage,
        positionId,
        positionOwner: position.owner,
        feeBips,
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
        positionId,
        feeBips,
        swapData,
        blockNumber,
      );

      return {
        solver,
        amount0,
        amount1,
        liquidity,
        swapData,
        swapRoute: getSwapRoute(mintParams, amount0, swapRoute),
        priceImpact: calcPriceImpact(
          position.pool,
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
      if (process.env.NODE_ENV !== 'production') {
        console.error(`Solver ${solver} failed: ${e}`);
      }
      return null;
    }
  };

  return (
    await Promise.all(
      ALL_SOLVERS.filter((solver) => !excludeSolvers.includes(solver)).map(
        solve,
      ),
    )
  ).filter((result): result is SolverResult => result !== null);
}

const getSwapRoute = (
  mintParams: MintParams,
  amount0: bigint,
  swapRoute?: SwapRoute,
) => {
  if (swapRoute) {
    return swapRoute;
  }
  swapRoute = [];
  if (mintParams.amount0Desired !== amount0) {
    // need a swap
    const [fromTokenAddress, toTokenAddress] =
      mintParams.amount0Desired > amount0
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
  return swapRoute;
};
