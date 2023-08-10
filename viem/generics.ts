import { Abi, AbiParametersToPrimitiveTypes } from 'abitype';
import { ExtractAbiFunction } from 'abitype/src/utils';

export type GetAbiFunctionParamsTypes<
  TAbi extends Abi,
  TName extends string,
> = AbiParametersToPrimitiveTypes<
  ExtractAbiFunction<TAbi, TName>['inputs'],
  'inputs'
>;

export type GetAbiFunctionReturnTypes<
  TAbi extends Abi,
  TName extends string,
> = AbiParametersToPrimitiveTypes<
  ExtractAbiFunction<TAbi, TName>['outputs'],
  'outputs'
>;
