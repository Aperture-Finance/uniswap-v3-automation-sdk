import { ApertureSupportedChainId } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

import {
  MintParams,
  simulateRebalance,
  simulateRemoveLiquidity,
} from '../automan';
import { PositionDetails } from '../position';
import {
  ALL_SOLVERS,
  E_Solver,
  SolveRebalanceProps,
  SwapRoute,
  getSolver,
} from '../solver';
import { calcPriceImpact, getSwapPath } from './internal';
import { SolverResult } from './types';

const failedResult: SolverResult = {
  amount0: 0n,
  amount1: 0n,
  liquidity: 0n,
  swapData: '0x',
  swapRoute: [],
};

async function solve(
  props: SolveRebalanceProps,
  solver: E_Solver,
): Promise<SolverResult> {
  const swapInfo = await getSolver(solver).rebalance(props);

  const { swapData } = swapInfo;
  if (!swapData) return failedResult;

  const { mintParams } = props;
  const [, liquidity, amount0, amount1] = await simulateRebalance(
    props.chainId,
    props.amm,
    props.publicClient,
    props.fromAddress,
    props.positionOwner,
    mintParams,
    props.positionId,
    props.feeBips,
    swapData,
    props.blockNumber,
  );

  const swapRoute = getSwapRoute(mintParams, amount0, swapInfo.swapRoute);

  return {
    solver,
    amount0,
    amount1,
    liquidity,
    swapData,
    swapRoute,
  };
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

  return Promise.all(
    ALL_SOLVERS.filter((solver) => !excludeSolvers.includes(solver)).map(
      async (solver) => {
        const result = await solve(
          {
            chainId,
            amm,
            publicClient,
            fromAddress,
            mintParams,
            slippage,
            positionId,
            positionOwner: position.owner,
            feeBips,
            blockNumber,
          },
          solver,
        );

        result.priceImpact = calcPriceImpact(
          position.pool,
          mintParams.amount0Desired,
          mintParams.amount1Desired,
          result.amount0,
          result.amount1,
        );

        result.swapPath = getSwapPath(
          position.pool.token0.address as Address,
          position.pool.token1.address as Address,
          receive0,
          receive1,
          result.amount0,
          result.amount1,
          slippage,
        );

        return result;
      },
    ),
  );
}
