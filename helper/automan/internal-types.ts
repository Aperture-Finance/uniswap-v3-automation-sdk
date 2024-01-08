import { UniV3Automan } from '@/index';

import { AutomanActionName, GetAutomanFragment } from './export-types';

export type AutomanCallInfo<T extends AutomanActionName> = {
  functionFragment: GetAutomanFragment<T>;
  data: string;
};

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

export type DecreaseLiquiditySingleReturnType = UnwrapPromise<
  ReturnType<
    UniV3Automan['callStatic'][GetAutomanFragment<'decreaseLiquiditySingle'>]
  >
>;

export type MintReturnType = UnwrapPromise<
  ReturnType<UniV3Automan['callStatic']['mintOptimal']>
>;

export type RemoveLiquidityReturnType = UnwrapPromise<
  ReturnType<UniV3Automan['callStatic'][GetAutomanFragment<'removeLiquidity('>]>
>;

export type RebalanceReturnType = UnwrapPromise<
  ReturnType<UniV3Automan['callStatic'][GetAutomanFragment<'rebalance'>]>
>;
