import {
  ApertureSupportedChainId,
  INonfungiblePositionManager,
  IUniV3Automan__factory,
  UniV3Automan,
  getChainInfo,
} from '@/index';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { FeeAmount, TICK_SPACINGS, nearestUsableTick } from '@uniswap/v3-sdk';
import { BytesLike } from 'ethers';

import {
  StateOverrides,
  getERC20Overrides,
  staticCallWithOverrides,
} from '../overrides';
import { UnwrapPromise } from './internal';

export type MintReturnType = UnwrapPromise<
  ReturnType<UniV3Automan['callStatic']['mintOptimal']>
>;
/**
 * Simulate a `mintOptimal` call by overriding the balances and allowances of the tokens involved.
 * @param chainId The chain ID.
 * @param provider A JSON RPC provider or a base provider.
 * @param from The address to simulate the call from.
 * @param mintParams The mint parameters.
 * @param swapData The swap data if using a router.
 * @param blockNumber Optional block number to query.
 * @param overrides Optional token approval and balance overrides.
 * @returns {tokenId, liquidity, amount0, amount1}
 */
export async function simulateMintOptimal(
  chainId: ApertureSupportedChainId,
  provider: JsonRpcProvider | Provider,
  from: string,
  mintParams: INonfungiblePositionManager.MintParamsStruct,
  swapData: BytesLike = '0x',
  blockNumber?: number,
  overrides?: StateOverrides,
): Promise<MintReturnType> {
  checkTicks(mintParams);
  const data = IUniV3Automan__factory.createInterface().encodeFunctionData(
    'mintOptimal',
    [mintParams, swapData],
  );
  const { aperture_uniswap_v3_automan } = getChainInfo(chainId);
  const tx = {
    from,
    to: aperture_uniswap_v3_automan,
    data,
  };
  let returnData: string;
  if (provider instanceof JsonRpcProvider) {
    if (overrides === undefined) {
      // forge token approvals and balances
      const [token0Overrides, token1Overrides] = await Promise.all([
        getERC20Overrides(
          mintParams.token0,
          from,
          aperture_uniswap_v3_automan,
          mintParams.amount0Desired,
          provider,
        ),
        getERC20Overrides(
          mintParams.token1,
          from,
          aperture_uniswap_v3_automan,
          mintParams.amount1Desired,
          provider,
        ),
      ]);
      overrides = {
        ...token0Overrides,
        ...token1Overrides,
      };
    }
    returnData = await staticCallWithOverrides(
      tx,
      overrides,
      provider,
      blockNumber,
    );
  } else {
    returnData = await provider.call(tx, blockNumber);
  }
  return IUniV3Automan__factory.createInterface().decodeFunctionResult(
    'mintOptimal',
    returnData,
  ) as MintReturnType;
}

function checkTicks(mintParams: INonfungiblePositionManager.MintParamsStruct) {
  const tickLower = Number(mintParams.tickLower.toString());
  const tickUpper = Number(mintParams.tickUpper.toString());
  const fee = mintParams.fee as FeeAmount;
  if (
    tickLower !== nearestUsableTick(tickLower, TICK_SPACINGS[fee]) ||
    tickUpper !== nearestUsableTick(tickUpper, TICK_SPACINGS[fee])
  ) {
    throw new Error('tickLower or tickUpper not valid');
  }
}
