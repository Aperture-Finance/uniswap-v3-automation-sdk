import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

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
  const { optimalSwapRouter } = getAMMInfo(chainId, amm)!;
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
    const poolPromise = optimalMintPool(
      chainId,
      amm,
      publicClient,
      fromAddress,
      mintParams,
      positionId,
      position.owner,
      feeBips,
      blockNumber,
    );
    if (usePool || !optimalSwapRouter) {
      return await poolPromise;
    }
    const [poolEstimate, routerEstimate] = await Promise.all([
      poolPromise,
      optimalMintRouter(
        chainId,
        amm,
        publicClient,
        fromAddress,
        mintParams,
        slippage,
        positionId,
        position.owner,
        feeBips,
        blockNumber,
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

async function optimalMintPool(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  fromAddress: Address,
  mintParams: MintParams,
  positionId: bigint,
  positionOwner: Address,
  feeBips: bigint,
  blockNumber?: bigint,
): Promise<SolverResult> {
  const [, liquidity, amount0, amount1] = await simulateRebalance(
    chainId,
    amm,
    publicClient,
    fromAddress,
    positionOwner,
    mintParams,
    positionId,
    feeBips,
    /*swapData =*/ '0x',
    blockNumber,
  );

  let swapRoute: SwapRoute = [];
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

  return {
    solver: E_Solver.UNISWAP,
    amount0,
    amount1,
    liquidity,
    swapData: '0x',
    swapRoute,
  };
}

async function optimalMintRouter(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  fromAddress: Address,
  mintParams: MintParams,
  slippage: number,
  positionId: bigint,
  positionOwner: Address,
  feeBips: bigint,
  blockNumber?: bigint,
): Promise<SolverResult> {
  const { swapData, swapRoute } = await getOptimalMintSwapData(
    chainId,
    amm,
    publicClient,
    mintParams,
    slippage,
    blockNumber,
    /** includeRoute= */ true,
  );
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
  return {
    solver: E_Solver.OneInch,
    amount0,
    amount1,
    liquidity,
    swapData,
    swapRoute,
  };
}
