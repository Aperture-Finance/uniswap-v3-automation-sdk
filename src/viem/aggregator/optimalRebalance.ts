import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex, PublicClient } from 'viem';

import {
  MintParams,
  simulateRebalance,
  simulateRemoveLiquidity,
} from '../automan';
import { PositionDetails } from '../position';
import {
  calcPriceImpact,
  getOptimalMintSwapData,
  getSwapPath,
} from './internal';
import { E_Solver, SolverResult, SwapRoute } from './types';

export async function optimalRebalance(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  positionId: bigint,
  newTickLower: number,
  newTickUpper: number,
  feeBips: bigint,
  usePool: boolean,
  fromAddress: Address,
  slippage: number,
  publicClient: PublicClient,
  blockNumber?: bigint,
  includeSwapInfo?: boolean,
): Promise<SolverResult> {
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

  const getEstimate = async () => {
    const props: SolveProps = {
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
    };
    const poolPromise = solve(props, E_Solver.UNISWAP);
    if (usePool) {
      return await poolPromise;
    }
    const [poolEstimate, routerEstimate] = await Promise.all([
      poolPromise,
      solve(props, E_Solver.OneInch),
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
      mintParams.amount0Desired,
      mintParams.amount1Desired,
      ret.amount0,
      ret.amount1,
    );

    ret.swapPath = getSwapPath(
      position.pool.token0.address as Address,
      position.pool.token1.address as Address,
      receive0,
      receive1,
      ret.amount0,
      ret.amount1,
      slippage,
    );
  }

  return ret;
}

interface SolveProps {
  chainId: ApertureSupportedChainId;
  amm: AutomatedMarketMakerEnum;
  publicClient: PublicClient;
  fromAddress: Address;
  mintParams: MintParams;
  slippage: number;
  positionId: bigint;
  positionOwner: Address;
  feeBips: bigint;
  blockNumber?: bigint;
}

const failedResult: SolverResult = {
  amount0: 0n,
  amount1: 0n,
  liquidity: 0n,
  swapData: '0x',
  swapRoute: [],
};

async function solve(
  props: SolveProps,
  solver: E_Solver,
): Promise<SolverResult> {
  let swapData: Hex = '0x';
  let swapRoute: SwapRoute | undefined;
  const {
    chainId,
    amm,
    publicClient,
    fromAddress,
    mintParams,
    slippage,
    positionId,
    positionOwner,
    feeBips,
    blockNumber,
  } = props;

  switch (solver) {
    case E_Solver.OneInch:
      const { optimalSwapRouter } = getAMMInfo(chainId, amm)!;
      if (!optimalSwapRouter) {
        return {
          ...failedResult,
          solver,
        };
      }
      ({ swapData, swapRoute } = await getOptimalMintSwapData(
        chainId,
        amm,
        publicClient,
        mintParams,
        slippage,
        blockNumber,
        /** includeRoute= */ true,
      ));
      break;
    case E_Solver.PH:
    case E_Solver.UNISWAP:
      break;
    default:
      throw new Error('Invalid solver');
  }

  const [, liquidity, amount0, amount1] = await simulateRebalance(
    chainId,
    amm,
    publicClient,
    fromAddress,
    positionOwner,
    mintParams,
    positionId,
    feeBips,
    swapData,
    blockNumber,
  );

  if (!swapRoute) {
    swapRoute = [];
    if (mintParams.amount0Desired !== amount0) {
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
  }

  return {
    solver,
    amount0,
    amount1,
    liquidity,
    swapData,
    swapRoute,
  };
}

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
    Object.values(E_Solver)
      .filter((solver) => !excludeSolvers.includes(solver))
      .map(async (solver) => {
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
      }),
  );
}
