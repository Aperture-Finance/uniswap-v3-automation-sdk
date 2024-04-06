import { GetAutomanFragment } from '@/helper';
import {
  ApertureSupportedChainId,
  Automan,
  IAutoman__factory,
  INonfungiblePositionManager,
  PermitInfo,
  getAMMInfo,
  getChainInfo,
} from '@/index';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { BigNumberish, BytesLike } from 'ethers';
import { splitSignature } from 'ethers/lib/utils';

import {
  getAutomanWhitelistOverrides,
  getNPMApprovalOverrides,
  tryStaticCallWithOverrides,
} from '../overrides';
import { AutomanCallInfo, UnwrapPromise } from './automan';

type DecreaseLiquiditySingleReturnType = UnwrapPromise<
  ReturnType<
    Automan['callStatic'][GetAutomanFragment<'decreaseLiquiditySingle'>]
  >
>;

/**
 * Simulate a `decreaseLiquidity` call.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param provider A JSON RPC provider or a base provider.
 * @param from The address to simulate the call from.
 * @param owner The owner of the position to decrease liquidity from.
 * @param tokenId The token ID of the position to decrease liquidity from.
 * @param liquidity The amount of liquidity to decrease.
 * @param zeroForOne Whether to swap token0 for token1 or vice versa.
 * @param amountMin The minimum amount of token0 or token1 to receive.
 * @param feeBips The percentage of position value to pay as a fee, multiplied by 1e18.
 * @param swapData The swap data if using a router.
 * @param blockNumber Optional block number to query.
 */
export async function simulateDecreaseLiquiditySingle(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  provider: JsonRpcProvider | Provider,
  from: string,
  owner: string,
  tokenId: BigNumberish,
  liquidity: BigNumberish,
  zeroForOne: boolean,
  amountMin: BigNumberish = 0,
  feeBips: BigNumberish = 0,
  swapData: BytesLike = '0x',
  blockNumber?: number,
): Promise<DecreaseLiquiditySingleReturnType> {
  const { functionFragment, data } = getAutomanDecreaseLiquiditySingleCallInfo(
    tokenId,
    liquidity,
    zeroForOne,
    Math.floor(Date.now() / 1000 + 86400),
    amountMin,
    feeBips,
    undefined,
    swapData,
  );
  return IAutoman__factory.createInterface().decodeFunctionResult(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    functionFragment,
    await tryStaticCallWithOverrides(
      from,
      getAMMInfo(chainId, amm)!.apertureAutoman,
      data,
      {
        ...getNPMApprovalOverrides(chainId, amm, owner),
        ...getAutomanWhitelistOverrides(
          chainId,
          amm,
          getChainInfo(chainId).aperture_router_proxy!,
        ),
      },
      provider,
      blockNumber,
    ),
  )[0] as DecreaseLiquiditySingleReturnType;
}

export function getAutomanDecreaseLiquiditySingleCallInfo(
  tokenId: BigNumberish,
  liquidity: BigNumberish,
  zeroForOne: boolean,
  deadline: BigNumberish,
  amountMin: BigNumberish = 0,
  feeBips: BigNumberish = 0,
  permitInfo?: PermitInfo,
  swapData: BytesLike = '0x',
): AutomanCallInfo<'decreaseLiquiditySingle'> {
  const params: INonfungiblePositionManager.DecreaseLiquidityParamsStruct = {
    tokenId,
    liquidity,
    amount0Min: zeroForOne ? 0 : amountMin,
    amount1Min: zeroForOne ? amountMin : 0,
    deadline,
  };
  if (permitInfo === undefined) {
    const functionFragment =
      'decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,bytes)';
    return {
      functionFragment,
      data: IAutoman__factory.createInterface().encodeFunctionData(
        functionFragment,
        [params, zeroForOne, feeBips, swapData],
      ),
    };
  }
  const { v, r, s } = splitSignature(permitInfo.signature);
  const functionFragment =
    'decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,bytes,uint256,uint8,bytes32,bytes32)';
  return {
    functionFragment,
    data: IAutoman__factory.createInterface().encodeFunctionData(
      functionFragment,
      [params, zeroForOne, feeBips, swapData, permitInfo.deadline, v, r, s],
    ),
  };
}
