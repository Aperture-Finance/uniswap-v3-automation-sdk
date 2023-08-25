import { FeeAmount, TICK_SPACINGS, nearestUsableTick } from '@uniswap/v3-sdk';
import { splitSignature } from 'ethers/lib/utils';
import {
  Address,
  Hex,
  PublicClient,
  WalletClient,
  decodeFunctionResult,
  encodeFunctionData,
  getContract,
} from 'viem';

import { ApertureSupportedChainId, PermitInfo } from '../interfaces';
import {
  INonfungiblePositionManager__factory,
  UniV3Automan__factory,
} from '../typechain-types';
import { getChainInfo } from './chain';
import {
  GetAbiFunctionParamsTypes,
  GetAbiFunctionReturnTypes,
} from './generics';
import {
  getAutomanWhitelistOverrides,
  getTokenOverrides,
  staticCallWithOverrides,
} from './overrides';

export type AutomanActionName =
  | 'mintOptimal'
  | 'decreaseLiquidity'
  | 'reinvest'
  | 'rebalance';

export type GetAutomanParams<T extends AutomanActionName> =
  GetAbiFunctionParamsTypes<typeof UniV3Automan__factory.abi, T>;

export type GetAutomanReturnTypes<T extends AutomanActionName> =
  GetAbiFunctionReturnTypes<typeof UniV3Automan__factory.abi, T>;

type IncreaseLiquidityParams = GetAbiFunctionParamsTypes<
  typeof INonfungiblePositionManager__factory.abi,
  'increaseLiquidity'
>[0];

type MintParams = GetAbiFunctionParamsTypes<
  typeof INonfungiblePositionManager__factory.abi,
  'mint'
>[0];

type MintReturnType = GetAutomanReturnTypes<'mintOptimal'>;

export function getAutomanContract(
  chainId: ApertureSupportedChainId,
  publicClient?: PublicClient,
  walletClient?: WalletClient,
) {
  return getContract({
    address: getChainInfo(chainId).aperture_uniswap_v3_automan,
    abi: UniV3Automan__factory.abi,
    publicClient,
    walletClient,
  });
}

export function getAutomanMintOptimalCalldata(
  mintParams: MintParams,
  swapData: Hex = '0x',
): Hex {
  return encodeFunctionData({
    abi: UniV3Automan__factory.abi,
    args: [mintParams, swapData] as const,
    functionName: 'mintOptimal',
  });
}

/**
 * Simulate a `mintOptimal` call by overriding the balances and allowances of the tokens involved.
 * @param chainId The chain ID.
 * @param publicClient Viem public client.
 * @param from The address to simulate the call from.
 * @param mintParams The mint parameters.
 * @param swapData The swap data if using a router.
 * @param blockNumber Optional block number to query.
 * @returns {tokenId, liquidity, amount0, amount1}
 */
export async function simulateMintOptimal(
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
  from: Address,
  mintParams: MintParams,
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<MintReturnType> {
  const tickLower = mintParams.tickLower;
  const tickUpper = mintParams.tickUpper;
  const fee = mintParams.fee as FeeAmount;
  if (
    tickLower !== nearestUsableTick(tickLower, TICK_SPACINGS[fee]) ||
    tickUpper !== nearestUsableTick(tickUpper, TICK_SPACINGS[fee])
  ) {
    throw new Error('tickLower or tickUpper not valid');
  }
  const data = getAutomanMintOptimalCalldata(mintParams, swapData);
  const { aperture_uniswap_v3_automan, aperture_router_proxy } =
    getChainInfo(chainId);
  const returnData = await staticCallWithOverrides(
    {
      from,
      to: aperture_uniswap_v3_automan,
      data,
    },
    // forge token approvals and balances
    {
      ...(aperture_router_proxy ? getAutomanWhitelistOverrides(chainId) : {}),
      ...(await getTokenOverrides(
        chainId,
        publicClient,
        from,
        mintParams.token0,
        mintParams.token1,
        mintParams.amount0Desired,
        mintParams.amount1Desired,
      )),
    },
    publicClient,
    blockNumber,
  );
  return decodeFunctionResult({
    abi: UniV3Automan__factory.abi,
    data: returnData,
    functionName: 'mintOptimal',
  });
}

export function getAutomanReinvestCalldata(
  positionId: bigint,
  deadline: bigint,
  amount0Min: bigint = BigInt(0),
  amount1Min: bigint = BigInt(0),
  feeBips: bigint = BigInt(0),
  permitInfo?: PermitInfo,
  swapData: Hex = '0x',
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
      args: [increaseLiquidityParams, feeBips, swapData] as const,
      functionName: 'reinvest',
    });
  }
  const permitSignature = splitSignature(permitInfo.signature);
  return encodeFunctionData({
    abi: UniV3Automan__factory.abi,
    args: [
      increaseLiquidityParams,
      feeBips,
      swapData,
      BigInt(permitInfo.deadline),
      permitSignature.v,
      permitSignature.r as Hex,
      permitSignature.s as Hex,
    ] as const,
    functionName: 'reinvest',
  });
}
