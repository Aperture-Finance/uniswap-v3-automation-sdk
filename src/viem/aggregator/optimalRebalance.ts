import { ApertureSupportedChainId, getChainInfo } from '@/index';
import { FeeAmount } from '@uniswap/v3-sdk';
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
  liquidity: bigint;
  swapData: Hex;
}> {
  const position = await PositionDetails.fromPositionId(
    chainId,
    positionId,
    publicClient,
    blockNumber,
  );
  const [receive0, receive1] = await simulateRemoveLiquidity(
    chainId,
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
  let swapData: Hex = '0x';
  if (!usePool) {
    swapData = (
      await getOptimalMintSwapData(
        chainId,
        publicClient,
        mintParams,
        slippage,
        blockNumber,
      )
    ).swapData;
  }
  const [, liquidity, amount0, amount1] = await simulateRebalance(
    chainId,
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
    amount0,
    amount1,
    liquidity,
    swapData,
  };
}

async function getOptimalMintSwapData(
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
  mintParams: MintParams,
  slippage: number,
  blockNumber?: bigint,
  includeRoute?: boolean,
): Promise<{
  swapData: Hex;
  swapRoute?: SwapRoute;
}> {
  const { optimal_swap_router, uniswap_v3_factory } = getChainInfo(chainId);
  const automan = getAutomanContract(chainId, publicClient);
  const approveTarget = await getApproveTarget(chainId);
  // get swap amounts using the same pool
  const [poolAmountIn, , zeroForOne] = await automan.read.getOptimalSwap(
    [
      computePoolAddress(
        uniswap_v3_factory,
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

  try {
    // get a quote from 1inch
    const { tx, protocols } = await quote(
      chainId,
      zeroForOne ? mintParams.token0 : mintParams.token1,
      zeroForOne ? mintParams.token1 : mintParams.token0,
      poolAmountIn.toString(),
      optimal_swap_router!,
      slippage * 100,
      includeRoute,
    );
    return {
      swapData: encodeOptimalSwapData(
        chainId,
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
    console.error(`Failed to get swap data: ${e}`);
  }
  return {
    swapData: '0x',
  };
}
