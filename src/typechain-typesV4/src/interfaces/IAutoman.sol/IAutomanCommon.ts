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
import type {
  FunctionFragment,
  Result,
  EventFragment,
} from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
} from "../../../common";

export declare namespace ICommonNonfungiblePositionManager {
  export type DecreaseLiquidityParamsStruct = {
    tokenId: BigNumberish;
    liquidity: BigNumberish;
    amount0Min: BigNumberish;
    amount1Min: BigNumberish;
    deadline: BigNumberish;
  };

  export type DecreaseLiquidityParamsStructOutput = [
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber
  ] & {
    tokenId: BigNumber;
    liquidity: BigNumber;
    amount0Min: BigNumber;
    amount1Min: BigNumber;
    deadline: BigNumber;
  };

  export type IncreaseLiquidityParamsStruct = {
    tokenId: BigNumberish;
    amount0Desired: BigNumberish;
    amount1Desired: BigNumberish;
    amount0Min: BigNumberish;
    amount1Min: BigNumberish;
    deadline: BigNumberish;
  };

  export type IncreaseLiquidityParamsStructOutput = [
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber
  ] & {
    tokenId: BigNumber;
    amount0Desired: BigNumber;
    amount1Desired: BigNumber;
    amount0Min: BigNumber;
    amount1Min: BigNumber;
    deadline: BigNumber;
  };
}

export declare namespace IAutomanCommon {
  export type FeeConfigStruct = {
    feeCollector: string;
    feeLimitPips: BigNumberish;
  };

  export type FeeConfigStructOutput = [string, BigNumber] & {
    feeCollector: string;
    feeLimitPips: BigNumber;
  };
}

export interface IAutomanCommonInterface extends utils.Interface {
  functions: {
    "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool)": FunctionFragment;
    "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool,uint256,uint8,bytes32,bytes32)": FunctionFragment;
    "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool)": FunctionFragment;
    "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool,uint256,uint8,bytes32,bytes32)": FunctionFragment;
    "getOptimalSwap(address,int24,int24,uint256,uint256)": FunctionFragment;
    "increaseLiquidity((uint256,uint256,uint256,uint256,uint256,uint256))": FunctionFragment;
    "increaseLiquidityOptimal((uint256,uint256,uint256,uint256,uint256,uint256),bytes,uint256,uint256)": FunctionFragment;
    "isController(address)": FunctionFragment;
    "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes)": FunctionFragment;
    "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes,uint256,uint8,bytes32,bytes32)": FunctionFragment;
    "setControllers(address[],bool[])": FunctionFragment;
    "setFeeConfig((address,uint96))": FunctionFragment;
    "setSwapRouters(address[],bool[])": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool)"
      | "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool,uint256,uint8,bytes32,bytes32)"
      | "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool)"
      | "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool,uint256,uint8,bytes32,bytes32)"
      | "getOptimalSwap"
      | "increaseLiquidity"
      | "increaseLiquidityOptimal"
      | "isController"
      | "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes)"
      | "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes,uint256,uint8,bytes32,bytes32)"
      | "setControllers"
      | "setFeeConfig"
      | "setSwapRouters"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool)",
    values: [
      ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      BigNumberish,
      BigNumberish,
      boolean
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool,uint256,uint8,bytes32,bytes32)",
    values: [
      ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      BigNumberish,
      BigNumberish,
      boolean,
      BigNumberish,
      BigNumberish,
      BytesLike,
      BytesLike
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool)",
    values: [
      ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      boolean,
      BigNumberish,
      BigNumberish,
      BytesLike,
      boolean
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool,uint256,uint8,bytes32,bytes32)",
    values: [
      ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      boolean,
      BigNumberish,
      BigNumberish,
      BytesLike,
      boolean,
      BigNumberish,
      BigNumberish,
      BytesLike,
      BytesLike
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "getOptimalSwap",
    values: [string, BigNumberish, BigNumberish, BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "increaseLiquidity",
    values: [ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "increaseLiquidityOptimal",
    values: [
      ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      BytesLike,
      BigNumberish,
      BigNumberish
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "isController",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes)",
    values: [
      ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      BigNumberish,
      BigNumberish,
      BytesLike
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes,uint256,uint8,bytes32,bytes32)",
    values: [
      ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      BigNumberish,
      BigNumberish,
      BytesLike,
      BigNumberish,
      BigNumberish,
      BytesLike,
      BytesLike
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "setControllers",
    values: [string[], boolean[]]
  ): string;
  encodeFunctionData(
    functionFragment: "setFeeConfig",
    values: [IAutomanCommon.FeeConfigStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "setSwapRouters",
    values: [string[], boolean[]]
  ): string;

  decodeFunctionResult(
    functionFragment: "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool,uint256,uint8,bytes32,bytes32)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool,uint256,uint8,bytes32,bytes32)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getOptimalSwap",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "increaseLiquidity",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "increaseLiquidityOptimal",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "isController",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes,uint256,uint8,bytes32,bytes32)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setControllers",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setFeeConfig",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setSwapRouters",
    data: BytesLike
  ): Result;

  events: {
    "ControllersSet(address[],bool[])": EventFragment;
    "DecreaseLiquidity(uint256)": EventFragment;
    "FeeConfigSet(address,uint96)": EventFragment;
    "IncreaseLiquidity(uint256)": EventFragment;
    "Mint(uint256)": EventFragment;
    "Rebalance(uint256)": EventFragment;
    "Reinvest(uint256)": EventFragment;
    "RemoveLiquidity(uint256)": EventFragment;
    "SwapRoutersSet(address[],bool[])": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "ControllersSet"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "DecreaseLiquidity"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "FeeConfigSet"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "IncreaseLiquidity"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Mint"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Rebalance"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Reinvest"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "RemoveLiquidity"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "SwapRoutersSet"): EventFragment;
}

export interface ControllersSetEventObject {
  controllers: string[];
  statuses: boolean[];
}
export type ControllersSetEvent = TypedEvent<
  [string[], boolean[]],
  ControllersSetEventObject
>;

export type ControllersSetEventFilter = TypedEventFilter<ControllersSetEvent>;

export interface DecreaseLiquidityEventObject {
  tokenId: BigNumber;
}
export type DecreaseLiquidityEvent = TypedEvent<
  [BigNumber],
  DecreaseLiquidityEventObject
>;

export type DecreaseLiquidityEventFilter =
  TypedEventFilter<DecreaseLiquidityEvent>;

export interface FeeConfigSetEventObject {
  feeCollector: string;
  feeLimitPips: BigNumber;
}
export type FeeConfigSetEvent = TypedEvent<
  [string, BigNumber],
  FeeConfigSetEventObject
>;

export type FeeConfigSetEventFilter = TypedEventFilter<FeeConfigSetEvent>;

export interface IncreaseLiquidityEventObject {
  tokenId: BigNumber;
}
export type IncreaseLiquidityEvent = TypedEvent<
  [BigNumber],
  IncreaseLiquidityEventObject
>;

export type IncreaseLiquidityEventFilter =
  TypedEventFilter<IncreaseLiquidityEvent>;

export interface MintEventObject {
  tokenId: BigNumber;
}
export type MintEvent = TypedEvent<[BigNumber], MintEventObject>;

export type MintEventFilter = TypedEventFilter<MintEvent>;

export interface RebalanceEventObject {
  tokenId: BigNumber;
}
export type RebalanceEvent = TypedEvent<[BigNumber], RebalanceEventObject>;

export type RebalanceEventFilter = TypedEventFilter<RebalanceEvent>;

export interface ReinvestEventObject {
  tokenId: BigNumber;
}
export type ReinvestEvent = TypedEvent<[BigNumber], ReinvestEventObject>;

export type ReinvestEventFilter = TypedEventFilter<ReinvestEvent>;

export interface RemoveLiquidityEventObject {
  tokenId: BigNumber;
}
export type RemoveLiquidityEvent = TypedEvent<
  [BigNumber],
  RemoveLiquidityEventObject
>;

export type RemoveLiquidityEventFilter = TypedEventFilter<RemoveLiquidityEvent>;

export interface SwapRoutersSetEventObject {
  routers: string[];
  statuses: boolean[];
}
export type SwapRoutersSetEvent = TypedEvent<
  [string[], boolean[]],
  SwapRoutersSetEventObject
>;

export type SwapRoutersSetEventFilter = TypedEventFilter<SwapRoutersSetEvent>;

export interface IAutomanCommon extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: IAutomanCommonInterface;

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
    "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      isUnwrapNative: boolean,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool,uint256,uint8,bytes32,bytes32)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      isUnwrapNative: boolean,
      permitDeadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      zeroForOne: boolean,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      isUnwrapNative: boolean,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool,uint256,uint8,bytes32,bytes32)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      zeroForOne: boolean,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      isUnwrapNative: boolean,
      permitDeadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    getOptimalSwap(
      pool: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      amount0Desired: BigNumberish,
      amount1Desired: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, boolean, BigNumber] & {
        amountIn: BigNumber;
        amountOut: BigNumber;
        zeroForOne: boolean;
        sqrtPriceX96: BigNumber;
      }
    >;

    increaseLiquidity(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<ContractTransaction>;

    increaseLiquidityOptimal(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      swapData: BytesLike,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<ContractTransaction>;

    isController(
      addressToCheck: string,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes)"(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes,uint256,uint8,bytes32,bytes32)"(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      permitDeadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    setControllers(
      controllers: string[],
      statuses: boolean[],
      overrides?: PayableOverrides & { from?: string }
    ): Promise<ContractTransaction>;

    setFeeConfig(
      _feeConfig: IAutomanCommon.FeeConfigStruct,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<ContractTransaction>;

    setSwapRouters(
      routers: string[],
      statuses: boolean[],
      overrides?: PayableOverrides & { from?: string }
    ): Promise<ContractTransaction>;
  };

  "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool)"(
    params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
    token0FeeAmount: BigNumberish,
    token1FeeAmount: BigNumberish,
    isUnwrapNative: boolean,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool,uint256,uint8,bytes32,bytes32)"(
    params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
    token0FeeAmount: BigNumberish,
    token1FeeAmount: BigNumberish,
    isUnwrapNative: boolean,
    permitDeadline: BigNumberish,
    v: BigNumberish,
    r: BytesLike,
    s: BytesLike,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool)"(
    params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
    zeroForOne: boolean,
    token0FeeAmount: BigNumberish,
    token1FeeAmount: BigNumberish,
    swapData: BytesLike,
    isUnwrapNative: boolean,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool,uint256,uint8,bytes32,bytes32)"(
    params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
    zeroForOne: boolean,
    token0FeeAmount: BigNumberish,
    token1FeeAmount: BigNumberish,
    swapData: BytesLike,
    isUnwrapNative: boolean,
    permitDeadline: BigNumberish,
    v: BigNumberish,
    r: BytesLike,
    s: BytesLike,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  getOptimalSwap(
    pool: string,
    tickLower: BigNumberish,
    tickUpper: BigNumberish,
    amount0Desired: BigNumberish,
    amount1Desired: BigNumberish,
    overrides?: CallOverrides
  ): Promise<
    [BigNumber, BigNumber, boolean, BigNumber] & {
      amountIn: BigNumber;
      amountOut: BigNumber;
      zeroForOne: boolean;
      sqrtPriceX96: BigNumber;
    }
  >;

  increaseLiquidity(
    params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<ContractTransaction>;

  increaseLiquidityOptimal(
    params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
    swapData: BytesLike,
    token0FeeAmount: BigNumberish,
    token1FeeAmount: BigNumberish,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<ContractTransaction>;

  isController(
    addressToCheck: string,
    overrides?: CallOverrides
  ): Promise<boolean>;

  "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes)"(
    params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
    token0FeeAmount: BigNumberish,
    token1FeeAmount: BigNumberish,
    swapData: BytesLike,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes,uint256,uint8,bytes32,bytes32)"(
    params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
    token0FeeAmount: BigNumberish,
    token1FeeAmount: BigNumberish,
    swapData: BytesLike,
    permitDeadline: BigNumberish,
    v: BigNumberish,
    r: BytesLike,
    s: BytesLike,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  setControllers(
    controllers: string[],
    statuses: boolean[],
    overrides?: PayableOverrides & { from?: string }
  ): Promise<ContractTransaction>;

  setFeeConfig(
    _feeConfig: IAutomanCommon.FeeConfigStruct,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<ContractTransaction>;

  setSwapRouters(
    routers: string[],
    statuses: boolean[],
    overrides?: PayableOverrides & { from?: string }
  ): Promise<ContractTransaction>;

  callStatic: {
    "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      isUnwrapNative: boolean,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber] & { amount0: BigNumber; amount1: BigNumber }
    >;

    "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool,uint256,uint8,bytes32,bytes32)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      isUnwrapNative: boolean,
      permitDeadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber] & { amount0: BigNumber; amount1: BigNumber }
    >;

    "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      zeroForOne: boolean,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      isUnwrapNative: boolean,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool,uint256,uint8,bytes32,bytes32)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      zeroForOne: boolean,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      isUnwrapNative: boolean,
      permitDeadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getOptimalSwap(
      pool: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      amount0Desired: BigNumberish,
      amount1Desired: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, boolean, BigNumber] & {
        amountIn: BigNumber;
        amountOut: BigNumber;
        zeroForOne: boolean;
        sqrtPriceX96: BigNumber;
      }
    >;

    increaseLiquidity(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber] & {
        liquidity: BigNumber;
        amount0: BigNumber;
        amount1: BigNumber;
      }
    >;

    increaseLiquidityOptimal(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      swapData: BytesLike,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber] & {
        liquidity: BigNumber;
        amount0: BigNumber;
        amount1: BigNumber;
      }
    >;

    isController(
      addressToCheck: string,
      overrides?: CallOverrides
    ): Promise<boolean>;

    "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes)"(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber] & {
        liquidity: BigNumber;
        amount0: BigNumber;
        amount1: BigNumber;
      }
    >;

    "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes,uint256,uint8,bytes32,bytes32)"(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      permitDeadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber] & {
        liquidity: BigNumber;
        amount0: BigNumber;
        amount1: BigNumber;
      }
    >;

    setControllers(
      controllers: string[],
      statuses: boolean[],
      overrides?: CallOverrides
    ): Promise<void>;

    setFeeConfig(
      _feeConfig: IAutomanCommon.FeeConfigStruct,
      overrides?: CallOverrides
    ): Promise<void>;

    setSwapRouters(
      routers: string[],
      statuses: boolean[],
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    "ControllersSet(address[],bool[])"(
      controllers?: null,
      statuses?: null
    ): ControllersSetEventFilter;
    ControllersSet(
      controllers?: null,
      statuses?: null
    ): ControllersSetEventFilter;

    "DecreaseLiquidity(uint256)"(
      tokenId?: BigNumberish | null
    ): DecreaseLiquidityEventFilter;
    DecreaseLiquidity(
      tokenId?: BigNumberish | null
    ): DecreaseLiquidityEventFilter;

    "FeeConfigSet(address,uint96)"(
      feeCollector?: null,
      feeLimitPips?: null
    ): FeeConfigSetEventFilter;
    FeeConfigSet(
      feeCollector?: null,
      feeLimitPips?: null
    ): FeeConfigSetEventFilter;

    "IncreaseLiquidity(uint256)"(
      tokenId?: BigNumberish | null
    ): IncreaseLiquidityEventFilter;
    IncreaseLiquidity(
      tokenId?: BigNumberish | null
    ): IncreaseLiquidityEventFilter;

    "Mint(uint256)"(tokenId?: BigNumberish | null): MintEventFilter;
    Mint(tokenId?: BigNumberish | null): MintEventFilter;

    "Rebalance(uint256)"(tokenId?: BigNumberish | null): RebalanceEventFilter;
    Rebalance(tokenId?: BigNumberish | null): RebalanceEventFilter;

    "Reinvest(uint256)"(tokenId?: BigNumberish | null): ReinvestEventFilter;
    Reinvest(tokenId?: BigNumberish | null): ReinvestEventFilter;

    "RemoveLiquidity(uint256)"(
      tokenId?: BigNumberish | null
    ): RemoveLiquidityEventFilter;
    RemoveLiquidity(tokenId?: BigNumberish | null): RemoveLiquidityEventFilter;

    "SwapRoutersSet(address[],bool[])"(
      routers?: null,
      statuses?: null
    ): SwapRoutersSetEventFilter;
    SwapRoutersSet(routers?: null, statuses?: null): SwapRoutersSetEventFilter;
  };

  estimateGas: {
    "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      isUnwrapNative: boolean,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool,uint256,uint8,bytes32,bytes32)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      isUnwrapNative: boolean,
      permitDeadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      zeroForOne: boolean,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      isUnwrapNative: boolean,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool,uint256,uint8,bytes32,bytes32)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      zeroForOne: boolean,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      isUnwrapNative: boolean,
      permitDeadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    getOptimalSwap(
      pool: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      amount0Desired: BigNumberish,
      amount1Desired: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    increaseLiquidity(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<BigNumber>;

    increaseLiquidityOptimal(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      swapData: BytesLike,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<BigNumber>;

    isController(
      addressToCheck: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes)"(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes,uint256,uint8,bytes32,bytes32)"(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      permitDeadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    setControllers(
      controllers: string[],
      statuses: boolean[],
      overrides?: PayableOverrides & { from?: string }
    ): Promise<BigNumber>;

    setFeeConfig(
      _feeConfig: IAutomanCommon.FeeConfigStruct,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<BigNumber>;

    setSwapRouters(
      routers: string[],
      statuses: boolean[],
      overrides?: PayableOverrides & { from?: string }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      isUnwrapNative: boolean,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256),uint256,uint256,bool,uint256,uint8,bytes32,bytes32)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      isUnwrapNative: boolean,
      permitDeadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      zeroForOne: boolean,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      isUnwrapNative: boolean,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    "decreaseLiquiditySingle((uint256,uint128,uint256,uint256,uint256),bool,uint256,uint256,bytes,bool,uint256,uint8,bytes32,bytes32)"(
      params: ICommonNonfungiblePositionManager.DecreaseLiquidityParamsStruct,
      zeroForOne: boolean,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      isUnwrapNative: boolean,
      permitDeadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    getOptimalSwap(
      pool: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      amount0Desired: BigNumberish,
      amount1Desired: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    increaseLiquidity(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    increaseLiquidityOptimal(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      swapData: BytesLike,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    isController(
      addressToCheck: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes)"(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    "reinvest((uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes,uint256,uint8,bytes32,bytes32)"(
      params: ICommonNonfungiblePositionManager.IncreaseLiquidityParamsStruct,
      token0FeeAmount: BigNumberish,
      token1FeeAmount: BigNumberish,
      swapData: BytesLike,
      permitDeadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    setControllers(
      controllers: string[],
      statuses: boolean[],
      overrides?: PayableOverrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    setFeeConfig(
      _feeConfig: IAutomanCommon.FeeConfigStruct,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    setSwapRouters(
      routers: string[],
      statuses: boolean[],
      overrides?: PayableOverrides & { from?: string }
    ): Promise<PopulatedTransaction>;
  };
}
