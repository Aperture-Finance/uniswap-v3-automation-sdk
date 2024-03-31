import {
  ApertureSupportedChainId,
  INonfungiblePositionManager,
  IUniV3Automan__factory,
  UniV3Automan,
  getChainInfoAMM,
} from '@/index';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { Position } from '@uniswap/v3-sdk';
import { BytesLike } from 'ethers';

import {
  StateOverrides,
  getERC20Overrides,
  staticCallWithOverrides,
} from '../overrides';
import { UnwrapPromise } from './automan';

export type IncreaseLiquidityOptimalReturnType = UnwrapPromise<
  ReturnType<UniV3Automan['callStatic']['increaseLiquidityOptimal']>
>;
/**
 * Simulate a `increaseLiquidityOptimal` call by overriding the balances and allowances of the tokens involved.
 * @param chainId The chain ID.
 * @param provider A JSON RPC provider or a base provider.
 * @param from The address to simulate the call from.
 * @param position The current position to simulate the call from.
 * @param increaseParams The increase liquidity parameters.
 * @param swapData The swap data if using a router.
 * @param blockNumber Optional block number to query.
 * @param overrides Optional token approval and balance overrides.
 * @returns {tokenId, liquidity, amount0, amount1}
 */
export async function simulateIncreaseLiquidityOptimal(
  chainId: ApertureSupportedChainId,
  provider: JsonRpcProvider | Provider,
  from: string,
  position: Position,
  increaseParams: INonfungiblePositionManager.IncreaseLiquidityParamsStruct,
  swapData: BytesLike = '0x',
  blockNumber?: number,
  overrides?: StateOverrides,
): Promise<IncreaseLiquidityOptimalReturnType> {
  const data = IUniV3Automan__factory.createInterface().encodeFunctionData(
    'increaseLiquidityOptimal',
    [increaseParams, swapData],
  );
  const { apertureAutoman } =
    getChainInfoAMM(chainId).ammToInfo.get('UNISWAP')!;
  const tx = {
    from,
    to: apertureAutoman,
    data,
  };
  let returnData: string;
  if (provider instanceof JsonRpcProvider) {
    if (overrides === undefined) {
      // forge token approvals and balances
      const [token0Overrides, token1Overrides] = await Promise.all([
        getERC20Overrides(
          position.pool.token0.address,
          from,
          apertureAutoman,
          increaseParams.amount0Desired,
          provider,
        ),
        getERC20Overrides(
          position.pool.token1.address,
          from,
          apertureAutoman,
          increaseParams.amount1Desired,
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
    'increaseLiquidityOptimal',
    returnData,
  ) as IncreaseLiquidityOptimalReturnType;
}
