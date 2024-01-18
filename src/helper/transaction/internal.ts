import { IUniV3Automan__factory } from '@/index';
import { Provider } from '@ethersproject/providers';
import { Percent } from '@uniswap/sdk-core';
import { Pool, Position } from '@uniswap/v3-sdk';
import { BigNumber, BigNumberish } from 'ethers';

import { AutomanFragment } from '../automan';

export interface SimulatedAmounts {
  amount0: BigNumber;
  amount1: BigNumber;
  amount0Min: BigNumberish;
  amount1Min: BigNumberish;
}

export async function getAmountsWithSlippage(
  pool: Pool,
  tickLower: number,
  tickUpper: number,
  automanAddress: string,
  ownerAddress: string,
  functionFragment: AutomanFragment,
  data: string,
  slippageTolerance: Percent,
  provider: Provider,
): Promise<SimulatedAmounts> {
  const returnData = await provider.call({
    from: ownerAddress,
    to: automanAddress,
    data,
  });
  const { amount0, amount1, liquidity } =
    IUniV3Automan__factory.createInterface().decodeFunctionResult(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      functionFragment,
      returnData,
    ) as unknown as {
      amount0: BigNumber;
      amount1: BigNumber;
      liquidity: BigNumber;
    };
  const { amount0: amount0Min, amount1: amount1Min } = new Position({
    pool,
    liquidity: liquidity.toString(),
    tickLower,
    tickUpper,
  }).mintAmountsWithSlippage(slippageTolerance);
  return {
    amount0,
    amount1,
    amount0Min: amount0Min.toString(),
    amount1Min: amount1Min.toString(),
  };
}
