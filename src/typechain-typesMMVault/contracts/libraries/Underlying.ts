/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
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
} from "../../common";

export type PositionUnderlyingStruct = {
  positionId: BytesLike;
  sqrtPriceX96: BigNumberish;
  pool: string;
  tick: BigNumberish;
  lowerTick: BigNumberish;
  upperTick: BigNumberish;
};

export type PositionUnderlyingStructOutput = [
  string,
  BigNumber,
  string,
  number,
  number,
  number
] & {
  positionId: string;
  sqrtPriceX96: BigNumber;
  pool: string;
  tick: number;
  lowerTick: number;
  upperTick: number;
};

export type RangeStruct = {
  lowerTick: BigNumberish;
  upperTick: BigNumberish;
  feeTier: BigNumberish;
};

export type RangeStructOutput = [number, number, number] & {
  lowerTick: number;
  upperTick: number;
  feeTier: number;
};

export type UnderlyingPayloadStruct = {
  ranges: RangeStruct[];
  factory: string;
  token0: string;
  token1: string;
  self: string;
};

export type UnderlyingPayloadStructOutput = [
  RangeStructOutput[],
  string,
  string,
  string,
  string
] & {
  ranges: RangeStructOutput[];
  factory: string;
  token0: string;
  token1: string;
  self: string;
};

export type RangeDataStruct = {
  self: string;
  range: RangeStruct;
  pool: string;
};

export type RangeDataStructOutput = [string, RangeStructOutput, string] & {
  self: string;
  range: RangeStructOutput;
  pool: string;
};

export interface UnderlyingInterface extends utils.Interface {
  functions: {
    "computeMintAmounts(uint256,uint256,uint256,uint256,uint256)": FunctionFragment;
    "getAmountsForDelta(uint160,uint160,uint160,int128)": FunctionFragment;
    "getUnderlyingBalances((bytes32,uint160,IUniswapV3Pool,int24,int24,int24))": FunctionFragment;
    "getUnderlyingBalancesMint((bytes32,uint160,IUniswapV3Pool,int24,int24,int24),uint256,uint256)": FunctionFragment;
    "subtractAdminFees(uint256,uint256,uint16)": FunctionFragment;
    "totalUnderlyingAtPriceWithFees(((int24,int24,uint24)[],IUniswapV3Factory,address,address,address),uint160)": FunctionFragment;
    "totalUnderlyingForMint(((int24,int24,uint24)[],IUniswapV3Factory,address,address,address),uint256,uint256)": FunctionFragment;
    "totalUnderlyingWithFees(((int24,int24,uint24)[],IUniswapV3Factory,address,address,address))": FunctionFragment;
    "underlying((address,(int24,int24,uint24),IUniswapV3Pool),uint160)": FunctionFragment;
    "underlyingMint((address,(int24,int24,uint24),IUniswapV3Pool),uint256,uint256)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "computeMintAmounts"
      | "getAmountsForDelta"
      | "getUnderlyingBalances"
      | "getUnderlyingBalancesMint"
      | "subtractAdminFees"
      | "totalUnderlyingAtPriceWithFees"
      | "totalUnderlyingForMint"
      | "totalUnderlyingWithFees"
      | "underlying"
      | "underlyingMint"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "computeMintAmounts",
    values: [
      BigNumberish,
      BigNumberish,
      BigNumberish,
      BigNumberish,
      BigNumberish
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "getAmountsForDelta",
    values: [BigNumberish, BigNumberish, BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "getUnderlyingBalances",
    values: [PositionUnderlyingStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "getUnderlyingBalancesMint",
    values: [PositionUnderlyingStruct, BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "subtractAdminFees",
    values: [BigNumberish, BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "totalUnderlyingAtPriceWithFees",
    values: [UnderlyingPayloadStruct, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "totalUnderlyingForMint",
    values: [UnderlyingPayloadStruct, BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "totalUnderlyingWithFees",
    values: [UnderlyingPayloadStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "underlying",
    values: [RangeDataStruct, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "underlyingMint",
    values: [RangeDataStruct, BigNumberish, BigNumberish]
  ): string;

  decodeFunctionResult(
    functionFragment: "computeMintAmounts",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getAmountsForDelta",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getUnderlyingBalances",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getUnderlyingBalancesMint",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "subtractAdminFees",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "totalUnderlyingAtPriceWithFees",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "totalUnderlyingForMint",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "totalUnderlyingWithFees",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "underlying", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "underlyingMint",
    data: BytesLike
  ): Result;

  events: {};
}

export interface Underlying extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: UnderlyingInterface;

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
    computeMintAmounts(
      current0_: BigNumberish,
      current1_: BigNumberish,
      totalSupply_: BigNumberish,
      amount0Max_: BigNumberish,
      amount1Max_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[BigNumber] & { mintAmount: BigNumber }>;

    getAmountsForDelta(
      sqrtRatioX96: BigNumberish,
      sqrtRatioAX96: BigNumberish,
      sqrtRatioBX96: BigNumberish,
      liquidity: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber] & { amount0: BigNumber; amount1: BigNumber }
    >;

    getUnderlyingBalances(
      positionUnderlying_: PositionUnderlyingStruct,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        amount0Current: BigNumber;
        amount1Current: BigNumber;
        fee0: BigNumber;
        fee1: BigNumber;
      }
    >;

    getUnderlyingBalancesMint(
      positionUnderlying_: PositionUnderlyingStruct,
      mintAmount_: BigNumberish,
      totalSupply_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        amount0Current: BigNumber;
        amount1Current: BigNumber;
        fee0: BigNumber;
        fee1: BigNumber;
      }
    >;

    subtractAdminFees(
      rawFee0_: BigNumberish,
      rawFee1_: BigNumberish,
      managerFeeBPS_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[BigNumber, BigNumber] & { fee0: BigNumber; fee1: BigNumber }>;

    totalUnderlyingAtPriceWithFees(
      underlyingPayload_: UnderlyingPayloadStruct,
      sqrtPriceX96_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        amount0: BigNumber;
        amount1: BigNumber;
        fee0: BigNumber;
        fee1: BigNumber;
      }
    >;

    totalUnderlyingForMint(
      underlyingPayload_: UnderlyingPayloadStruct,
      mintAmount_: BigNumberish,
      totalSupply_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber] & { amount0: BigNumber; amount1: BigNumber }
    >;

    totalUnderlyingWithFees(
      underlyingPayload_: UnderlyingPayloadStruct,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        amount0: BigNumber;
        amount1: BigNumber;
        fee0: BigNumber;
        fee1: BigNumber;
      }
    >;

    underlying(
      underlying_: RangeDataStruct,
      sqrtPriceX96_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        amount0: BigNumber;
        amount1: BigNumber;
        fee0: BigNumber;
        fee1: BigNumber;
      }
    >;

    underlyingMint(
      underlying_: RangeDataStruct,
      mintAmount_: BigNumberish,
      totalSupply_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        amount0: BigNumber;
        amount1: BigNumber;
        fee0: BigNumber;
        fee1: BigNumber;
      }
    >;
  };

  computeMintAmounts(
    current0_: BigNumberish,
    current1_: BigNumberish,
    totalSupply_: BigNumberish,
    amount0Max_: BigNumberish,
    amount1Max_: BigNumberish,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  getAmountsForDelta(
    sqrtRatioX96: BigNumberish,
    sqrtRatioAX96: BigNumberish,
    sqrtRatioBX96: BigNumberish,
    liquidity: BigNumberish,
    overrides?: CallOverrides
  ): Promise<
    [BigNumber, BigNumber] & { amount0: BigNumber; amount1: BigNumber }
  >;

  getUnderlyingBalances(
    positionUnderlying_: PositionUnderlyingStruct,
    overrides?: CallOverrides
  ): Promise<
    [BigNumber, BigNumber, BigNumber, BigNumber] & {
      amount0Current: BigNumber;
      amount1Current: BigNumber;
      fee0: BigNumber;
      fee1: BigNumber;
    }
  >;

  getUnderlyingBalancesMint(
    positionUnderlying_: PositionUnderlyingStruct,
    mintAmount_: BigNumberish,
    totalSupply_: BigNumberish,
    overrides?: CallOverrides
  ): Promise<
    [BigNumber, BigNumber, BigNumber, BigNumber] & {
      amount0Current: BigNumber;
      amount1Current: BigNumber;
      fee0: BigNumber;
      fee1: BigNumber;
    }
  >;

  subtractAdminFees(
    rawFee0_: BigNumberish,
    rawFee1_: BigNumberish,
    managerFeeBPS_: BigNumberish,
    overrides?: CallOverrides
  ): Promise<[BigNumber, BigNumber] & { fee0: BigNumber; fee1: BigNumber }>;

  totalUnderlyingAtPriceWithFees(
    underlyingPayload_: UnderlyingPayloadStruct,
    sqrtPriceX96_: BigNumberish,
    overrides?: CallOverrides
  ): Promise<
    [BigNumber, BigNumber, BigNumber, BigNumber] & {
      amount0: BigNumber;
      amount1: BigNumber;
      fee0: BigNumber;
      fee1: BigNumber;
    }
  >;

  totalUnderlyingForMint(
    underlyingPayload_: UnderlyingPayloadStruct,
    mintAmount_: BigNumberish,
    totalSupply_: BigNumberish,
    overrides?: CallOverrides
  ): Promise<
    [BigNumber, BigNumber] & { amount0: BigNumber; amount1: BigNumber }
  >;

  totalUnderlyingWithFees(
    underlyingPayload_: UnderlyingPayloadStruct,
    overrides?: CallOverrides
  ): Promise<
    [BigNumber, BigNumber, BigNumber, BigNumber] & {
      amount0: BigNumber;
      amount1: BigNumber;
      fee0: BigNumber;
      fee1: BigNumber;
    }
  >;

  underlying(
    underlying_: RangeDataStruct,
    sqrtPriceX96_: BigNumberish,
    overrides?: CallOverrides
  ): Promise<
    [BigNumber, BigNumber, BigNumber, BigNumber] & {
      amount0: BigNumber;
      amount1: BigNumber;
      fee0: BigNumber;
      fee1: BigNumber;
    }
  >;

  underlyingMint(
    underlying_: RangeDataStruct,
    mintAmount_: BigNumberish,
    totalSupply_: BigNumberish,
    overrides?: CallOverrides
  ): Promise<
    [BigNumber, BigNumber, BigNumber, BigNumber] & {
      amount0: BigNumber;
      amount1: BigNumber;
      fee0: BigNumber;
      fee1: BigNumber;
    }
  >;

  callStatic: {
    computeMintAmounts(
      current0_: BigNumberish,
      current1_: BigNumberish,
      totalSupply_: BigNumberish,
      amount0Max_: BigNumberish,
      amount1Max_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getAmountsForDelta(
      sqrtRatioX96: BigNumberish,
      sqrtRatioAX96: BigNumberish,
      sqrtRatioBX96: BigNumberish,
      liquidity: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber] & { amount0: BigNumber; amount1: BigNumber }
    >;

    getUnderlyingBalances(
      positionUnderlying_: PositionUnderlyingStruct,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        amount0Current: BigNumber;
        amount1Current: BigNumber;
        fee0: BigNumber;
        fee1: BigNumber;
      }
    >;

    getUnderlyingBalancesMint(
      positionUnderlying_: PositionUnderlyingStruct,
      mintAmount_: BigNumberish,
      totalSupply_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        amount0Current: BigNumber;
        amount1Current: BigNumber;
        fee0: BigNumber;
        fee1: BigNumber;
      }
    >;

    subtractAdminFees(
      rawFee0_: BigNumberish,
      rawFee1_: BigNumberish,
      managerFeeBPS_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[BigNumber, BigNumber] & { fee0: BigNumber; fee1: BigNumber }>;

    totalUnderlyingAtPriceWithFees(
      underlyingPayload_: UnderlyingPayloadStruct,
      sqrtPriceX96_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        amount0: BigNumber;
        amount1: BigNumber;
        fee0: BigNumber;
        fee1: BigNumber;
      }
    >;

    totalUnderlyingForMint(
      underlyingPayload_: UnderlyingPayloadStruct,
      mintAmount_: BigNumberish,
      totalSupply_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber] & { amount0: BigNumber; amount1: BigNumber }
    >;

    totalUnderlyingWithFees(
      underlyingPayload_: UnderlyingPayloadStruct,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        amount0: BigNumber;
        amount1: BigNumber;
        fee0: BigNumber;
        fee1: BigNumber;
      }
    >;

    underlying(
      underlying_: RangeDataStruct,
      sqrtPriceX96_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        amount0: BigNumber;
        amount1: BigNumber;
        fee0: BigNumber;
        fee1: BigNumber;
      }
    >;

    underlyingMint(
      underlying_: RangeDataStruct,
      mintAmount_: BigNumberish,
      totalSupply_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber] & {
        amount0: BigNumber;
        amount1: BigNumber;
        fee0: BigNumber;
        fee1: BigNumber;
      }
    >;
  };

  filters: {};

  estimateGas: {
    computeMintAmounts(
      current0_: BigNumberish,
      current1_: BigNumberish,
      totalSupply_: BigNumberish,
      amount0Max_: BigNumberish,
      amount1Max_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getAmountsForDelta(
      sqrtRatioX96: BigNumberish,
      sqrtRatioAX96: BigNumberish,
      sqrtRatioBX96: BigNumberish,
      liquidity: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getUnderlyingBalances(
      positionUnderlying_: PositionUnderlyingStruct,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getUnderlyingBalancesMint(
      positionUnderlying_: PositionUnderlyingStruct,
      mintAmount_: BigNumberish,
      totalSupply_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    subtractAdminFees(
      rawFee0_: BigNumberish,
      rawFee1_: BigNumberish,
      managerFeeBPS_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    totalUnderlyingAtPriceWithFees(
      underlyingPayload_: UnderlyingPayloadStruct,
      sqrtPriceX96_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    totalUnderlyingForMint(
      underlyingPayload_: UnderlyingPayloadStruct,
      mintAmount_: BigNumberish,
      totalSupply_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    totalUnderlyingWithFees(
      underlyingPayload_: UnderlyingPayloadStruct,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    underlying(
      underlying_: RangeDataStruct,
      sqrtPriceX96_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    underlyingMint(
      underlying_: RangeDataStruct,
      mintAmount_: BigNumberish,
      totalSupply_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    computeMintAmounts(
      current0_: BigNumberish,
      current1_: BigNumberish,
      totalSupply_: BigNumberish,
      amount0Max_: BigNumberish,
      amount1Max_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getAmountsForDelta(
      sqrtRatioX96: BigNumberish,
      sqrtRatioAX96: BigNumberish,
      sqrtRatioBX96: BigNumberish,
      liquidity: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getUnderlyingBalances(
      positionUnderlying_: PositionUnderlyingStruct,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getUnderlyingBalancesMint(
      positionUnderlying_: PositionUnderlyingStruct,
      mintAmount_: BigNumberish,
      totalSupply_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    subtractAdminFees(
      rawFee0_: BigNumberish,
      rawFee1_: BigNumberish,
      managerFeeBPS_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    totalUnderlyingAtPriceWithFees(
      underlyingPayload_: UnderlyingPayloadStruct,
      sqrtPriceX96_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    totalUnderlyingForMint(
      underlyingPayload_: UnderlyingPayloadStruct,
      mintAmount_: BigNumberish,
      totalSupply_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    totalUnderlyingWithFees(
      underlyingPayload_: UnderlyingPayloadStruct,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    underlying(
      underlying_: RangeDataStruct,
      sqrtPriceX96_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    underlyingMint(
      underlying_: RangeDataStruct,
      mintAmount_: BigNumberish,
      totalSupply_: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}
