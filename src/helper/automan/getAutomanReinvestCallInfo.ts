import {
  IAutoman__factory,
  INonfungiblePositionManager,
  PermitInfo,
} from '@/index';
import { BigNumberish, BytesLike } from 'ethers';
import { splitSignature } from 'ethers/lib/utils';

import { AutomanCallInfo } from './automan';

export function getAutomanReinvestCallInfo(
  tokenId: BigNumberish,
  deadline: BigNumberish,
  amount0Min: BigNumberish = 0,
  amount1Min: BigNumberish = 0,
  feeBips: BigNumberish = 0,
  permitInfo?: PermitInfo,
  swapData: BytesLike = '0x',
): AutomanCallInfo<'reinvest'> {
  const params: INonfungiblePositionManager.IncreaseLiquidityParamsStruct = {
    tokenId,
    amount0Desired: 0, // Param value ignored by Automan.
    amount1Desired: 0, // Param value ignored by Automan.
    amount0Min,
    amount1Min,
    deadline,
  };
  if (permitInfo === undefined) {
    const functionFragment =
      'reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,bytes)';
    return {
      functionFragment,
      data: IAutoman__factory.createInterface().encodeFunctionData(
        functionFragment,
        [params, feeBips, swapData],
      ),
    };
  }
  const { v, r, s } = splitSignature(permitInfo.signature);
  const functionFragment =
    'reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,bytes,uint256,uint8,bytes32,bytes32)';
  return {
    functionFragment,
    data: IAutoman__factory.createInterface().encodeFunctionData(
      functionFragment,
      [params, feeBips, swapData, permitInfo.deadline, v, r, s],
    ),
  };
}
