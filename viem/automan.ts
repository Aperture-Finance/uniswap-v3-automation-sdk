import { splitSignature } from 'ethers/lib/utils';
import { Hex, encodeFunctionData } from 'viem';

import { PermitInfo } from '../interfaces';
import {
  INonfungiblePositionManager__factory,
  UniV3Automan__factory,
} from '../typechain-types';
import { GetAbiFunctionParamsTypes } from './generics';

export type AutomanActionName = 'decreaseLiquidity' | 'reinvest' | 'rebalance';

export type GetAutomanParams<T extends AutomanActionName> =
  GetAbiFunctionParamsTypes<typeof UniV3Automan__factory.abi, T>;

type IncreaseLiquidityParams = GetAbiFunctionParamsTypes<
  typeof INonfungiblePositionManager__factory.abi,
  'increaseLiquidity'
>[0];

export function getAutomanReinvestCalldata(
  positionId: bigint,
  deadline: bigint,
  amount0Min: bigint = BigInt(0),
  amount1Min: bigint = BigInt(0),
  permitInfo?: PermitInfo,
): Hex {
  const increaseLiquidityParams: IncreaseLiquidityParams = {
    tokenId: positionId,
    amount0Desired: BigInt(0), // Param value ignored by Automan.
    amount1Desired: BigInt(0), // Param value ignored by Automan.
    amount0Min,
    amount1Min,
    deadline,
  };
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: UniV3Automan__factory.abi,
      args: [
        increaseLiquidityParams,
        /*feeBips=*/ BigInt(0),
        /*swapData=*/ '0x',
      ] as const,
      functionName: 'reinvest',
    });
  }
  const permitSignature = splitSignature(permitInfo.signature);
  return encodeFunctionData({
    abi: UniV3Automan__factory.abi,
    args: [
      increaseLiquidityParams,
      /*feeBips=*/ BigInt(0),
      /*swapData=*/ '0x',
      BigInt(permitInfo.deadline),
      permitSignature.v,
      permitSignature.r as Hex,
      permitSignature.s as Hex,
    ] as const,
    functionName: 'reinvest',
  });
}
