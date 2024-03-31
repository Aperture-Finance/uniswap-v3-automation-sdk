import { GetAutomanFragment } from '@/helper';
import {
  ApertureSupportedChainId,
  INonfungiblePositionManager,
  IUniV3Automan__factory,
  PermitInfo,
  UniV3Automan,
  getChainInfoAMM,
} from '@/index';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { BigNumberish } from 'ethers';
import { splitSignature } from 'ethers/lib/utils';

import {
  getNPMApprovalOverrides,
  tryStaticCallWithOverrides,
} from '../overrides';
import { AutomanCallInfo, UnwrapPromise } from './automan';

type RemoveLiquidityReturnType = UnwrapPromise<
  ReturnType<UniV3Automan['callStatic'][GetAutomanFragment<'removeLiquidity('>]>
>;

/**
 * Simulate a `removeLiquidity` call.
 * @param chainId The chain ID.
 * @param provider A JSON RPC provider or a base provider.
 * @param from The address to simulate the call from.
 * @param owner The owner of the position to burn.
 * @param tokenId The token ID of the position to burn.
 * @param amount0Min The minimum amount of token0 to receive.
 * @param amount1Min The minimum amount of token1 to receive.
 * @param feeBips The percentage of position value to pay as a fee, multiplied by 1e18.
 * @param blockNumber Optional block number to query.
 */
export async function simulateRemoveLiquidity(
  chainId: ApertureSupportedChainId,
  provider: JsonRpcProvider | Provider,
  from: string,
  owner: string,
  tokenId: BigNumberish,
  amount0Min: BigNumberish = 0,
  amount1Min: BigNumberish = 0,
  feeBips: BigNumberish = 0,
  blockNumber?: number,
): Promise<RemoveLiquidityReturnType> {
  const { functionFragment, data } = getAutomanRemoveLiquidityCallInfo(
    tokenId,
    Math.floor(Date.now() / 1000 + 86400),
    amount0Min,
    amount1Min,
    feeBips,
  );
  return IUniV3Automan__factory.createInterface().decodeFunctionResult(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    functionFragment,
    await tryStaticCallWithOverrides(
      from,
      getChainInfoAMM(chainId).UNISWAP.apertureAutoman,
      data,
      getNPMApprovalOverrides(chainId, owner),
      provider,
      blockNumber,
    ),
  ) as RemoveLiquidityReturnType;
}

export function getAutomanRemoveLiquidityCallInfo(
  tokenId: BigNumberish,
  deadline: BigNumberish,
  amount0Min: BigNumberish = 0,
  amount1Min: BigNumberish = 0,
  feeBips: BigNumberish = 0,
  permitInfo?: PermitInfo,
): AutomanCallInfo<'removeLiquidity('> {
  const params: INonfungiblePositionManager.DecreaseLiquidityParamsStruct = {
    tokenId,
    liquidity: 0, // Param value ignored by Automan.
    amount0Min,
    amount1Min,
    deadline,
  };
  if (permitInfo === undefined) {
    const functionFragment =
      'removeLiquidity((uint256,uint128,uint256,uint256,uint256),uint256)';
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
    'removeLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,uint8,bytes32,bytes32)';
  return {
    functionFragment,
    data: IUniV3Automan__factory.createInterface().encodeFunctionData(
      functionFragment,
      [params, feeBips, permitInfo.deadline, v, r, s],
    ),
  };
}
