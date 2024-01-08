import {
  ApertureSupportedChainId,
  INonfungiblePositionManager,
  getChainInfo,
} from '@/index';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { FeeAmount } from '@uniswap/v3-sdk';
import { BigNumberish } from 'ethers';

import {
  encodeOptimalSwapData,
  getAutomanContract,
  simulateRebalance,
  simulateRemoveLiquidity,
} from '../automan';
import { computePoolAddress } from '../pool';
import { PositionDetails } from '../position';
import { getApproveTarget } from './getApproveTarget';
import { quote } from './quote';

export async function optimalRebalance(
  chainId: ApertureSupportedChainId,
  positionId: BigNumberish,
  newTickLower: number,
  newTickUpper: number,
  feeBips: BigNumberish,
  usePool: boolean,
  fromAddress: string,
  slippage: number,
  provider: JsonRpcProvider | Provider,
) {
  const position = await PositionDetails.fromPositionId(
    chainId,
    positionId,
    provider,
  );
  const { amount0: receive0, amount1: receive1 } =
    await simulateRemoveLiquidity(
      chainId,
      provider,
      fromAddress,
      position.owner,
      position.tokenId,
      0,
      0,
      feeBips,
    );
  const mintParams: INonfungiblePositionManager.MintParamsStruct = {
    token0: position.token0.address,
    token1: position.token1.address,
    fee: position.fee,
    tickLower: newTickLower,
    tickUpper: newTickUpper,
    amount0Desired: receive0,
    amount1Desired: receive1,
    amount0Min: 0, // Setting this to zero for tx simulation.
    amount1Min: 0, // Setting this to zero for tx simulation.
    recipient: fromAddress, // Param value ignored by Automan for rebalance.
    deadline: Math.floor(Date.now() / 1000 + 86400),
  };
  let swapData = '0x';
  if (!usePool) {
    try {
      swapData = await getOptimalMintSwapData(
        chainId,
        provider,
        mintParams,
        slippage,
      );
    } catch (e) {
      console.error(`Failed to get swap data: ${e}`);
    }
  }
  const { amount0, amount1, liquidity } = await simulateRebalance(
    chainId,
    provider,
    fromAddress,
    position.owner,
    mintParams,
    positionId,
    feeBips,
    swapData,
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
  provider: JsonRpcProvider | Provider,
  mintParams: INonfungiblePositionManager.MintParamsStruct,
  slippage: number,
) {
  const { optimal_swap_router, uniswap_v3_factory } = getChainInfo(chainId);
  const automan = getAutomanContract(chainId, provider);
  const approveTarget = await getApproveTarget(chainId);
  // get swap amounts using the same pool
  const { amountIn: poolAmountIn, zeroForOne } = await automan.getOptimalSwap(
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
  );
  // get a quote from 1inch
  const { tx } = await quote(
    chainId,
    zeroForOne ? mintParams.token0 : mintParams.token1,
    zeroForOne ? mintParams.token1 : mintParams.token0,
    poolAmountIn.toString(),
    optimal_swap_router!,
    slippage * 100,
  );
  return encodeOptimalSwapData(
    chainId,
    mintParams.token0,
    mintParams.token1,
    mintParams.fee as FeeAmount,
    mintParams.tickLower as number,
    mintParams.tickUpper as number,
    zeroForOne,
    approveTarget,
    tx.to,
    tx.data,
  );
}
