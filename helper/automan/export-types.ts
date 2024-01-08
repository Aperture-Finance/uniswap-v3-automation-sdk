import { UniV3Automan } from '@/index';

export type AutomanActionName =
  | 'decreaseLiquidity'
  | 'decreaseLiquiditySingle'
  | 'reinvest'
  | 'rebalance'
  | 'removeLiquidity('; // append '(' in order to distinguish from removeLiquiditySingle, otherwise GetAutomanFragment<removeLiquidity> will return 'removeLiquiditySingle' | 'removeLiquidity'

export type AutomanFragment = {
  [K in keyof UniV3Automan['functions']]: K extends `${AutomanActionName}${string}`
    ? K
    : never;
}[keyof UniV3Automan['functions']];

export type GetAutomanFragment<T extends AutomanActionName> = {
  [P in AutomanFragment]: P extends `${T}${string}` ? P : never;
}[AutomanFragment];

export type GetAutomanParams<T extends AutomanFragment> = Parameters<
  UniV3Automan['functions'][T]
>;
