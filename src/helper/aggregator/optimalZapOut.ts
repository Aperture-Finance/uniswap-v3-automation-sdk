import { ApertureSupportedChainId, getChainInfoAMM } from '@/index';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { BigNumberish } from 'ethers';

import {
  encodeSwapData,
  simulateDecreaseLiquiditySingle,
  simulateRemoveLiquidity,
} from '../automan';
import { PositionDetails } from '../position';
import { getApproveTarget } from './index';
import { quote } from './quote';

/**
 * Get the optimal amount of tokens to zap out of a position.
 * @param chainId The chain ID.
 * @param positionId The position ID.
 * @param zeroForOne Whether to swap token0 for token1 or vice versa.
 * @param feeBips The percentage of position value to pay as a fee, multiplied by 1e18.
 * @param fromAddress The address of the caller.
 * @param slippage The slippage tolerance.
 * @param provider A JSON RPC provider or a base provider.
 */
export async function optimalZapOut(
  chainId: ApertureSupportedChainId,
  positionId: BigNumberish,
  zeroForOne: boolean,
  feeBips: BigNumberish,
  fromAddress: string,
  slippage: number,
  provider: JsonRpcProvider | Provider,
) {
  const position = await PositionDetails.fromPositionId(
    chainId,
    positionId,
    provider,
  );
  const poolPromise = poolZapOut(
    chainId,
    provider,
    fromAddress,
    position,
    feeBips,
    zeroForOne,
  );
  if (getChainInfoAMM(chainId).aperture_router_proxy === undefined) {
    return await poolPromise;
  }
  const [poolEstimate, routerEstimate] = await Promise.all([
    poolPromise,
    routerZapOut(
      chainId,
      provider,
      fromAddress,
      position,
      feeBips,
      zeroForOne,
      slippage,
    ),
  ]);
  // use the same pool if the quote isn't better
  if (poolEstimate.amount.gte(routerEstimate.amount)) {
    return poolEstimate;
  } else {
    return routerEstimate;
  }
}

async function poolZapOut(
  chainId: ApertureSupportedChainId,
  provider: JsonRpcProvider | Provider,
  fromAddress: string,
  position: PositionDetails,
  feeBips: BigNumberish,
  zeroForOne: boolean,
) {
  const amount = await simulateDecreaseLiquiditySingle(
    chainId,
    provider,
    fromAddress,
    position.owner,
    position.tokenId,
    position.liquidity,
    zeroForOne,
    0,
    feeBips,
  );
  return {
    amount,
    swapData: '0x',
  };
}

async function routerZapOut(
  chainId: ApertureSupportedChainId,
  provider: JsonRpcProvider | Provider,
  fromAddress: string,
  position: PositionDetails,
  feeBips: BigNumberish,
  zeroForOne: boolean,
  slippage: number,
) {
  const swapData = await getZapOutSwapData(
    chainId,
    provider,
    fromAddress,
    position,
    feeBips,
    zeroForOne,
    slippage,
  );
  const amount = await simulateDecreaseLiquiditySingle(
    chainId,
    provider,
    fromAddress,
    position.owner,
    position.tokenId,
    position.liquidity,
    zeroForOne,
    0,
    feeBips,
    swapData,
  );
  return {
    amount,
    swapData,
  };
}

async function getZapOutSwapData(
  chainId: ApertureSupportedChainId,
  provider: JsonRpcProvider | Provider,
  fromAddress: string,
  position: PositionDetails,
  feeBips: BigNumberish,
  zeroForOne: boolean,
  slippage: number,
) {
  try {
    const { amount0, amount1 } = await simulateRemoveLiquidity(
      chainId,
      provider,
      fromAddress,
      position.owner,
      position.tokenId,
      0,
      0,
      feeBips,
    );
    const tokenIn = zeroForOne
      ? position.token0.address
      : position.token1.address;
    const tokenOut = zeroForOne
      ? position.token1.address
      : position.token0.address;
    const amountIn = zeroForOne ? amount0.toString() : amount1.toString();
    // get a quote from 1inch
    const { tx } = await quote(
      chainId,
      tokenIn,
      tokenOut,
      amountIn,
      getChainInfoAMM(chainId).aperture_router_proxy!,
      slippage * 100,
    );
    const approveTarget = await getApproveTarget(chainId);
    return encodeSwapData(
      chainId,
      tx.to,
      approveTarget,
      tokenIn,
      tokenOut,
      amountIn,
      tx.data,
    );
  } catch (e) {
    console.warn(`Failed to get swap data: ${e}`);
  }
  return '0x';
}
