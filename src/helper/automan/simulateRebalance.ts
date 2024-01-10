import {
  ApertureSupportedChainId,
  INonfungiblePositionManager,
  IUniV3Automan__factory,
  PermitInfo,
  UniV3Automan,
  getChainInfo,
} from '@/src';
import { GetAutomanFragment } from '@/src/helper';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { BigNumberish, BytesLike } from 'ethers';
import { splitSignature } from 'ethers/lib/utils';

import {
  getNPMApprovalOverrides,
  tryStaticCallWithOverrides,
} from '../overrides';
import { UnwrapPromise, checkTicks } from './internal';
import { AutomanCallInfo } from './internal';

type RebalanceReturnType = UnwrapPromise<
  ReturnType<UniV3Automan['callStatic'][GetAutomanFragment<'rebalance'>]>
>;

/**
 * Simulate a `rebalance` call.
 * @param chainId The chain ID.
 * @param provider A JSON RPC provider or a base provider.
 * @param from The address to simulate the call from.
 * @param owner The owner of the position to rebalance.
 * @param mintParams The mint parameters.
 * @param tokenId The token ID of the position to rebalance.
 * @param feeBips The percentage of position value to pay as a fee, multiplied by 1e18.
 * @param swapData The swap data if using a router.
 * @param blockNumber Optional block number to query.
 */
export async function simulateRebalance(
  chainId: ApertureSupportedChainId,
  provider: JsonRpcProvider | Provider,
  from: string,
  owner: string,
  mintParams: INonfungiblePositionManager.MintParamsStruct,
  tokenId: BigNumberish,
  feeBips: BigNumberish = 0,
  swapData: BytesLike = '0x',
  blockNumber?: number,
): Promise<RebalanceReturnType> {
  checkTicks(mintParams);
  const { functionFragment, data } = getAutomanRebalanceCallInfo(
    mintParams,
    tokenId,
    feeBips,
    undefined,
    swapData,
  );
  return IUniV3Automan__factory.createInterface().decodeFunctionResult(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    functionFragment,
    await tryStaticCallWithOverrides(
      from,
      getChainInfo(chainId).aperture_uniswap_v3_automan,
      data,
      getNPMApprovalOverrides(chainId, owner),
      provider,
      blockNumber,
    ),
  ) as RebalanceReturnType;
}

export function getAutomanRebalanceCallInfo(
  mintParams: INonfungiblePositionManager.MintParamsStruct,
  tokenId: BigNumberish,
  feeBips: BigNumberish = 0,
  permitInfo?: PermitInfo,
  swapData: BytesLike = '0x',
): AutomanCallInfo<'rebalance'> {
  if (permitInfo === undefined) {
    const functionFragment =
      'rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,uint256,bytes)';
    return {
      functionFragment,
      data: IUniV3Automan__factory.createInterface().encodeFunctionData(
        functionFragment,
        [mintParams, tokenId, feeBips, swapData],
      ),
    };
  }
  const { v, r, s } = splitSignature(permitInfo.signature);
  const functionFragment =
    'rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,uint256,bytes,uint256,uint8,bytes32,bytes32)';
  return {
    functionFragment,
    data: IUniV3Automan__factory.createInterface().encodeFunctionData(
      functionFragment,
      [mintParams, tokenId, feeBips, swapData, permitInfo.deadline, v, r, s],
    ),
  };
}
