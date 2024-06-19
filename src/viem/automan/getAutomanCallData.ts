import { Automan__factory, PermitInfo } from '@/index';
import { Hex, encodeFunctionData, hexToSignature } from 'viem';

import {
  DecreaseLiquidityParams,
  IncreaseLiquidityParams,
  MintParams,
} from './types';

export function getAutomanMintOptimalCalldata(
  mintParams: MintParams,
  swapData: Hex = '0x',
): Hex {
  return encodeFunctionData({
    abi: Automan__factory.abi,
    args: [mintParams, swapData] as const,
    functionName: 'mintOptimal',
  });
}

export function getAutomanIncreaseLiquidityOptimalCallData(
  increaseParams: IncreaseLiquidityParams,
  swapData: Hex = '0x',
): Hex {
  return encodeFunctionData({
    abi: Automan__factory.abi,
    args: [increaseParams, swapData] as const,
    functionName: 'increaseLiquidityOptimal',
  });
}

export function getAutomanDecreaseLiquidityCalldata(
  tokenId: bigint,
  liquidity: bigint,
  deadline: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
  feeBips = BigInt(0),
  permitInfo?: PermitInfo,
): Hex {
  const params: DecreaseLiquidityParams = {
    tokenId,
    liquidity,
    amount0Min,
    amount1Min,
    deadline,
  };
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: Automan__factory.abi,
      args: [params, feeBips] as const,
      functionName: 'decreaseLiquidity',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  return encodeFunctionData({
    abi: Automan__factory.abi,
    args: [
      params,
      feeBips,
      BigInt(permitInfo.deadline),
      Number(v),
      r,
      s,
    ] as const,
    functionName: 'decreaseLiquidity',
  });
}

export function getAutomanRebalanceCalldata(
  mintParams: MintParams,
  tokenId: bigint,
  feeBips = BigInt(0),
  permitInfo?: PermitInfo,
  swapData: Hex = '0x',
): Hex {
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: Automan__factory.abi,
      args: [mintParams, tokenId, feeBips, swapData] as const,
      functionName: 'rebalance',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  return encodeFunctionData({
    abi: Automan__factory.abi,
    args: [
      mintParams,
      tokenId,
      feeBips,
      swapData,
      BigInt(permitInfo.deadline),
      Number(v),
      r,
      s,
    ] as const,
    functionName: 'rebalance',
  });
}

export function getAutomanReinvestCalldata(
  tokenId: bigint,
  deadline: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
  feeBips = BigInt(0),
  permitInfo?: PermitInfo,
  swapData: Hex = '0x',
): Hex {
  const params: IncreaseLiquidityParams = {
    tokenId,
    amount0Desired: BigInt(0), // Param value ignored by Automan.
    amount1Desired: BigInt(0), // Param value ignored by Automan.
    amount0Min,
    amount1Min,
    deadline,
  };
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: Automan__factory.abi,
      args: [params, feeBips, swapData] as const,
      functionName: 'reinvest',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  return encodeFunctionData({
    abi: Automan__factory.abi,
    args: [
      params,
      feeBips,
      swapData,
      BigInt(permitInfo.deadline),
      Number(v),
      r,
      s,
    ] as const,
    functionName: 'reinvest',
  });
}

export function getAutomanRemoveLiquidityCalldata(
  tokenId: bigint,
  deadline: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
  feeBips = BigInt(0),
  permitInfo?: PermitInfo,
): Hex {
  const params: DecreaseLiquidityParams = {
    tokenId,
    liquidity: BigInt(0), // Param value ignored by Automan.
    amount0Min,
    amount1Min,
    deadline,
  };
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: Automan__factory.abi,
      args: [params, feeBips] as const,
      functionName: 'removeLiquidity',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  return encodeFunctionData({
    abi: Automan__factory.abi,
    args: [
      params,
      feeBips,
      BigInt(permitInfo.deadline),
      Number(v),
      r,
      s,
    ] as const,
    functionName: 'removeLiquidity',
  });
}
