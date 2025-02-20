/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PayableOverrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type { FunctionFragment, Result } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
} from "../../../common";

export declare namespace IUniswapV3NonfungiblePositionManager {
  export type MintParamsStruct = {
    token0: string;
    token1: string;
    fee: BigNumberish;
    tickLower: BigNumberish;
    tickUpper: BigNumberish;
    amount0Desired: BigNumberish;
    amount1Desired: BigNumberish;
    amount0Min: BigNumberish;
    amount1Min: BigNumberish;
    recipient: string;
    deadline: BigNumberish;
  };

  export type MintParamsStructOutput = [
    string,
    string,
    number,
    number,
    number,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    string,
    BigNumber
  ] & {
    token0: string;
    token1: string;
    fee: number;
    tickLower: number;
    tickUpper: number;
    amount0Desired: BigNumber;
    amount1Desired: BigNumber;
    amount0Min: BigNumber;
    amount1Min: BigNumber;
    recipient: string;
    deadline: BigNumber;
  };
}

export declare namespace IAutomanCommon {
  export type CollectConfigStruct = {
    token0FeeAmount: BigNumberish;
    token1FeeAmount: BigNumberish;
    tokenOut: string;
    swapData0: BytesLike;
    swapData1: BytesLike;
    isUnwrapNative: boolean;
  };

  export type CollectConfigStructOutput = [
    BigNumber,
    BigNumber,
    string,
    string,
    string,
    boolean
  ] & {
    token0FeeAmount: BigNumber;
    token1FeeAmount: BigNumber;
    tokenOut: string;
    swapData0: string;
    swapData1: string;
    isUnwrapNative: boolean;
  };

  export type PermitStruct = {
    deadline: BigNumberish;
    v: BigNumberish;
    r: BytesLike;
    s: BytesLike;
  };

  export type PermitStructOutput = [BigNumber, number, string, string] & {
    deadline: BigNumber;
    v: number;
    r: string;
    s: string;
  };
}

export interface IAutomanUniV3MintRebalanceInterface extends utils.Interface {
  functions: {
    "mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256))": FunctionFragment;
    "mintFromTokenIn((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),address,uint256,bytes,bytes)": FunctionFragment;
    "mintOptimal((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),bytes,uint256,uint256)": FunctionFragment;
    "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool),(uint256,uint8,bytes32,bytes32))": FunctionFragment;
    "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool))": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "mint"
      | "mintFromTokenIn"
      | "mintOptimal"
      | "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool),(uint256,uint8,bytes32,bytes32))"
      | "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool))"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "mint",
    values: [IUniswapV3NonfungiblePositionManager.MintParamsStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "mintFromTokenIn",
    values: [
      IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      string,
      BigNumberish,
      BytesLike,
      BytesLike
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "mintOptimal",
    values: [
      IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      BytesLike,
      BigNumberish,
      BigNumberish
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool),(uint256,uint8,bytes32,bytes32))",
    values: [
      IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      BigNumberish,
      BytesLike,
      boolean,
      IAutomanCommon.CollectConfigStruct,
      IAutomanCommon.PermitStruct
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool))",
    values: [
      IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      BigNumberish,
      BytesLike,
      boolean,
      IAutomanCommon.CollectConfigStruct
    ]
  ): string;

  decodeFunctionResult(functionFragment: "mint", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "mintFromTokenIn",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "mintOptimal",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool),(uint256,uint8,bytes32,bytes32))",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool))",
    data: BytesLike
  ): Result;

  events: {};
}

export interface IAutomanUniV3MintRebalance extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: IAutomanUniV3MintRebalanceInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    mint(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<ContractTransaction>;

    mintFromTokenIn(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      tokenIn: string,
      tokenInFeeAmount: BigNumberish,
      swapData0: BytesLike,
      swapData1: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<ContractTransaction>;

    mintOptimal(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      swapData: BytesLike,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<ContractTransaction>;

    "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool),(uint256,uint8,bytes32,bytes32))"(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      tokenId: BigNumberish,
      swapData: BytesLike,
      isCollect: boolean,
      collectConfig: IAutomanCommon.CollectConfigStruct,
      permit: IAutomanCommon.PermitStruct,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool))"(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      tokenId: BigNumberish,
      swapData: BytesLike,
      isCollect: boolean,
      collectConfig: IAutomanCommon.CollectConfigStruct,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;
  };

  mint(
    params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<ContractTransaction>;

  mintFromTokenIn(
    params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
    tokenIn: string,
    tokenInFeeAmount: BigNumberish,
    swapData0: BytesLike,
    swapData1: BytesLike,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<ContractTransaction>;

  mintOptimal(
    params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
    swapData: BytesLike,
    token0FeeAmount: BigNumberish,
    token1FeeAmount: BigNumberish,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<ContractTransaction>;

  "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool),(uint256,uint8,bytes32,bytes32))"(
    params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
    tokenId: BigNumberish,
    swapData: BytesLike,
    isCollect: boolean,
    collectConfig: IAutomanCommon.CollectConfigStruct,
    permit: IAutomanCommon.PermitStruct,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool))"(
    params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
    tokenId: BigNumberish,
    swapData: BytesLike,
    isCollect: boolean,
    collectConfig: IAutomanCommon.CollectConfigStruct,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  callStatic: {
    mint(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        tokenId: BigNumber;
        liquidity: BigNumber;
        amount0: BigNumber;
        amount1: BigNumber;
      }
    >;

    mintFromTokenIn(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      tokenIn: string,
      tokenInFeeAmount: BigNumberish,
      swapData0: BytesLike,
      swapData1: BytesLike,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        tokenId: BigNumber;
        liquidity: BigNumber;
        amount0: BigNumber;
        amount1: BigNumber;
      }
    >;

    mintOptimal(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      swapData: BytesLike,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        tokenId: BigNumber;
        liquidity: BigNumber;
        amount0: BigNumber;
        amount1: BigNumber;
      }
    >;

    "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool),(uint256,uint8,bytes32,bytes32))"(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      tokenId: BigNumberish,
      swapData: BytesLike,
      isCollect: boolean,
      collectConfig: IAutomanCommon.CollectConfigStruct,
      permit: IAutomanCommon.PermitStruct,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        newTokenId: BigNumber;
        liquidity: BigNumber;
        amount0: BigNumber;
        amount1: BigNumber;
      }
    >;

    "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool))"(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      tokenId: BigNumberish,
      swapData: BytesLike,
      isCollect: boolean,
      collectConfig: IAutomanCommon.CollectConfigStruct,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        newTokenId: BigNumber;
        liquidity: BigNumber;
        amount0: BigNumber;
        amount1: BigNumber;
      }
    >;
  };

  filters: {};

  estimateGas: {
    mint(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<BigNumber>;

    mintFromTokenIn(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      tokenIn: string,
      tokenInFeeAmount: BigNumberish,
      swapData0: BytesLike,
      swapData1: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<BigNumber>;

    mintOptimal(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      swapData: BytesLike,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<BigNumber>;

    "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool),(uint256,uint8,bytes32,bytes32))"(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      tokenId: BigNumberish,
      swapData: BytesLike,
      isCollect: boolean,
      collectConfig: IAutomanCommon.CollectConfigStruct,
      permit: IAutomanCommon.PermitStruct,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool))"(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      tokenId: BigNumberish,
      swapData: BytesLike,
      isCollect: boolean,
      collectConfig: IAutomanCommon.CollectConfigStruct,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    mint(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    mintFromTokenIn(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      tokenIn: string,
      tokenInFeeAmount: BigNumberish,
      swapData0: BytesLike,
      swapData1: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    mintOptimal(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      swapData: BytesLike,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool),(uint256,uint8,bytes32,bytes32))"(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      tokenId: BigNumberish,
      swapData: BytesLike,
      isCollect: boolean,
      collectConfig: IAutomanCommon.CollectConfigStruct,
      permit: IAutomanCommon.PermitStruct,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    "rebalance((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256),uint256,bytes,bool,(uint256,uint256,address,bytes,bytes,bool))"(
      params: IUniswapV3NonfungiblePositionManager.MintParamsStruct,
      tokenId: BigNumberish,
      swapData: BytesLike,
      isCollect: boolean,
      collectConfig: IAutomanCommon.CollectConfigStruct,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;
  };
}
