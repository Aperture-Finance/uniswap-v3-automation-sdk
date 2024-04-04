import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex, PublicClient } from 'viem';

import {
  MintParams,
  encodeOptimalSwapData,
  getAutomanContract,
  simulateRebalance,
  simulateRemoveLiquidity,
} from '../automan';
import { computePoolAddress } from '../pool';
import { PositionDetails } from '../position';
import { getApproveTarget } from './aggregator';
import { SwapRoute, quote } from './quote';

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
): Promise<{
  amount0: bigint;
  amount1: bigint;
  receive0: bigint;
  receive1: bigint;
  liquidity: bigint;
  swapData: Hex;
  swapRoute?: SwapRoute;
}> {
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
  if (!usePool) {
    if (optimalSwapRouter === undefined) {
      return { ...(await poolPromise), receive0, receive1 };
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
      return { ...poolEstimate, receive0, receive1 };
    } else {
      return { ...routerEstimate, receive0, receive1 };
    }
  } else {
    return { ...(await poolPromise), receive0, receive1 };
  }
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
): Promise<{
  amount0: bigint;
  amount1: bigint;
  liquidity: bigint;
  swapData: Hex;
  swapRoute?: SwapRoute;
}> {
  const [, liquidity, amount0, amount1] = await simulateRebalance(
    chainId,
    amm,
    publicClient,
    fromAddress,
    positionOwner,
    mintParams,
    positionId,
    feeBips,
    undefined,
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
): Promise<{
  amount0: bigint;
  amount1: bigint;
  liquidity: bigint;
  swapData: Hex;
  swapRoute?: SwapRoute;
}> {
  const { swapData, swapRoute } = await getOptimalMintSwapData(
    chainId,
    amm,
    publicClient,
    mintParams,
    slippage,
    /** blockNumber= */ undefined,
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
    amount0,
    amount1,
    liquidity,
    swapData,
    swapRoute,
  };
}

async function getOptimalMintSwapData(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  mintParams: MintParams,
  slippage: number,
  blockNumber?: bigint,
  includeRoute?: boolean,
): Promise<{
  swapData: Hex;
  swapRoute?: SwapRoute;
}> {
  try {
    const { optimalSwapRouter, factory } = getAMMInfo(chainId, amm)!;
    const automan = getAutomanContract(chainId, amm, publicClient);
    const approveTarget = await getApproveTarget(chainId);
    // get swap amounts using the same pool
    const [poolAmountIn, , zeroForOne] = await automan.read.getOptimalSwap(
      [
        computePoolAddress(
          factory,
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

    // get a quote from 1inch
    const { tx, protocols } = await quote(
      chainId,
      zeroForOne ? mintParams.token0 : mintParams.token1,
      zeroForOne ? mintParams.token1 : mintParams.token0,
      poolAmountIn.toString(),
      optimalSwapRouter!,
      slippage * 100,
      includeRoute,
    );
    return {
      swapData: encodeOptimalSwapData(
        chainId,
        amm,
        mintParams.token0,
        mintParams.token1,
        mintParams.fee as FeeAmount,
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
    swapData: '0x',
  };
}
