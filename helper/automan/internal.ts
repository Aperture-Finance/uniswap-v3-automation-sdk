import { INonfungiblePositionManager } from '@/index';
import { FeeAmount, TICK_SPACINGS, nearestUsableTick } from '@uniswap/v3-sdk';

import { AutomanActionName, GetAutomanFragment } from './export-types';

export type AutomanCallInfo<T extends AutomanActionName> = {
  functionFragment: GetAutomanFragment<T>;
  data: string;
};

export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

export function checkTicks(
  mintParams: INonfungiblePositionManager.MintParamsStruct,
) {
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
