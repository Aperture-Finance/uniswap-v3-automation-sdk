import {
  INonfungiblePositionManager,
  IUniV3Automan__factory,
  PermitInfo,
} from '@/index';
import { BigNumberish } from 'ethers';
import { splitSignature } from 'ethers/lib/utils';

import { AutomanCallInfo } from './automan';

export function getAutomanDecreaseLiquidityCallInfo(
  tokenId: BigNumberish,
  liquidity: BigNumberish,
  deadline: BigNumberish,
  amount0Min: BigNumberish = 0,
  amount1Min: BigNumberish = 0,
  feeBips: BigNumberish = 0,
  permitInfo?: PermitInfo,
): AutomanCallInfo<'decreaseLiquidity'> {
  const params: INonfungiblePositionManager.DecreaseLiquidityParamsStruct = {
    tokenId,
    liquidity,
    amount0Min,
    amount1Min,
    deadline,
  };
  if (permitInfo === undefined) {
    const functionFragment =
      'decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256)';
    return {
      functionFragment,
      data: IUniV3Automan__factory.createInterface().encodeFunctionData(
        functionFragment,
        [params, feeBips],
      ),
    };
  }
  const { v, r, s } = splitSignature(permitInfo.signature);
  const functionFragment =
    'decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,uint8,bytes32,bytes32)';
  return {
    functionFragment,
    data: IUniV3Automan__factory.createInterface().encodeFunctionData(
      functionFragment,
      [params, feeBips, permitInfo.deadline, v, r, s],
    ),
  };
}
