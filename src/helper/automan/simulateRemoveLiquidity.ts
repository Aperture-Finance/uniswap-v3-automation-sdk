import { GetAutomanFragment } from '@/helper';
import {
  ApertureSupportedChainId,
  Automan,
  IAutoman__factory,
  INonfungiblePositionManager,
  PermitInfo,
  getAMMInfo,
} from '@/index';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { BigNumberish } from 'ethers';
import { splitSignature } from 'ethers/lib/utils';

import {
  getNPMApprovalOverrides,
  tryStaticCallWithOverrides,
} from '../overrides';
import { AutomanCallInfo, UnwrapPromise } from './automan';

type RemoveLiquidityReturnType = UnwrapPromise<
  ReturnType<Automan['callStatic'][GetAutomanFragment<'removeLiquidity('>]>
>;

/**
 * Simulate a `removeLiquidity` call.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
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
  amm: AutomatedMarketMakerEnum,
  provider: JsonRpcProvider | Provider,
  from: string,
  owner: string,
  tokenId: BigNumberish,
  amount0Min: BigNumberish = 0,
  amount1Min: BigNumberish = 0,
  feeBips: BigNumberish = 0,
  blockNumber?: number,
  customAmmContract?: string,
): Promise<RemoveLiquidityReturnType> {
  const { functionFragment, data } = getAutomanRemoveLiquidityCallInfo(
    tokenId,
    Math.floor(Date.now() / 1000 + 86400),
    amount0Min,
    amount1Min,
    feeBips,
  );
  const destContract =
    customAmmContract || getAMMInfo(chainId, amm)!.apertureAutoman;
  return IAutoman__factory.createInterface().decodeFunctionResult(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    functionFragment,
    await tryStaticCallWithOverrides(
      from,
      destContract,
      data,
      getNPMApprovalOverrides(chainId, amm, owner),
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
      data: IAutoman__factory.createInterface().encodeFunctionData(
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
    data: IAutoman__factory.createInterface().encodeFunctionData(
      functionFragment,
      [params, feeBips, permitInfo.deadline, v, r, s],
    ),
  };
}
