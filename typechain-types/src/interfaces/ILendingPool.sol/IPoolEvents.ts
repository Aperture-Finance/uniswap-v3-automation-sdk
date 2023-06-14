/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type { BaseContract, BigNumber, Signer, utils } from "ethers";
import type { EventFragment } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
} from "../../../common";

export interface IPoolEventsInterface extends utils.Interface {
  functions: {};

  events: {
    "AddLiquidity(address,address,uint256)": EventFragment;
    "Borrow(address,uint256)": EventFragment;
    "NewExpectedLiquidityLimit(uint256)": EventFragment;
    "NewInterestRateModel(address)": EventFragment;
    "NewTreasuryAddress(address)": EventFragment;
    "NewWithdrawFee(uint256)": EventFragment;
    "RemoveLiquidity(address,address,uint256)": EventFragment;
    "Repay(address,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "AddLiquidity"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Borrow"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "NewExpectedLiquidityLimit"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "NewInterestRateModel"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "NewTreasuryAddress"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "NewWithdrawFee"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "RemoveLiquidity"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Repay"): EventFragment;
}

export interface AddLiquidityEventObject {
  sender: string;
  onBehalfOf: string;
  amount: BigNumber;
}
export type AddLiquidityEvent = TypedEvent<
  [string, string, BigNumber],
  AddLiquidityEventObject
>;

export type AddLiquidityEventFilter = TypedEventFilter<AddLiquidityEvent>;

export interface BorrowEventObject {
  borrower: string;
  amount: BigNumber;
}
export type BorrowEvent = TypedEvent<[string, BigNumber], BorrowEventObject>;

export type BorrowEventFilter = TypedEventFilter<BorrowEvent>;

export interface NewExpectedLiquidityLimitEventObject {
  newLimit: BigNumber;
}
export type NewExpectedLiquidityLimitEvent = TypedEvent<
  [BigNumber],
  NewExpectedLiquidityLimitEventObject
>;

export type NewExpectedLiquidityLimitEventFilter =
  TypedEventFilter<NewExpectedLiquidityLimitEvent>;

export interface NewInterestRateModelEventObject {
  newInterestRateModel: string;
}
export type NewInterestRateModelEvent = TypedEvent<
  [string],
  NewInterestRateModelEventObject
>;

export type NewInterestRateModelEventFilter =
  TypedEventFilter<NewInterestRateModelEvent>;

export interface NewTreasuryAddressEventObject {
  treasuryAddress: string;
}
export type NewTreasuryAddressEvent = TypedEvent<
  [string],
  NewTreasuryAddressEventObject
>;

export type NewTreasuryAddressEventFilter =
  TypedEventFilter<NewTreasuryAddressEvent>;

export interface NewWithdrawFeeEventObject {
  fee: BigNumber;
}
export type NewWithdrawFeeEvent = TypedEvent<
  [BigNumber],
  NewWithdrawFeeEventObject
>;

export type NewWithdrawFeeEventFilter = TypedEventFilter<NewWithdrawFeeEvent>;

export interface RemoveLiquidityEventObject {
  sender: string;
  to: string;
  amount: BigNumber;
}
export type RemoveLiquidityEvent = TypedEvent<
  [string, string, BigNumber],
  RemoveLiquidityEventObject
>;

export type RemoveLiquidityEventFilter = TypedEventFilter<RemoveLiquidityEvent>;

export interface RepayEventObject {
  borrower: string;
  borrowedAmount: BigNumber;
}
export type RepayEvent = TypedEvent<[string, BigNumber], RepayEventObject>;

export type RepayEventFilter = TypedEventFilter<RepayEvent>;

export interface IPoolEvents extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: IPoolEventsInterface;

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

  functions: {};

  callStatic: {};

  filters: {
    "AddLiquidity(address,address,uint256)"(
      sender?: string | null,
      onBehalfOf?: string | null,
      amount?: null
    ): AddLiquidityEventFilter;
    AddLiquidity(
      sender?: string | null,
      onBehalfOf?: string | null,
      amount?: null
    ): AddLiquidityEventFilter;

    "Borrow(address,uint256)"(
      borrower?: string | null,
      amount?: null
    ): BorrowEventFilter;
    Borrow(borrower?: string | null, amount?: null): BorrowEventFilter;

    "NewExpectedLiquidityLimit(uint256)"(
      newLimit?: null
    ): NewExpectedLiquidityLimitEventFilter;
    NewExpectedLiquidityLimit(
      newLimit?: null
    ): NewExpectedLiquidityLimitEventFilter;

    "NewInterestRateModel(address)"(
      newInterestRateModel?: string | null
    ): NewInterestRateModelEventFilter;
    NewInterestRateModel(
      newInterestRateModel?: string | null
    ): NewInterestRateModelEventFilter;

    "NewTreasuryAddress(address)"(
      treasuryAddress?: string | null
    ): NewTreasuryAddressEventFilter;
    NewTreasuryAddress(
      treasuryAddress?: string | null
    ): NewTreasuryAddressEventFilter;

    "NewWithdrawFee(uint256)"(fee?: null): NewWithdrawFeeEventFilter;
    NewWithdrawFee(fee?: null): NewWithdrawFeeEventFilter;

    "RemoveLiquidity(address,address,uint256)"(
      sender?: string | null,
      to?: string | null,
      amount?: null
    ): RemoveLiquidityEventFilter;
    RemoveLiquidity(
      sender?: string | null,
      to?: string | null,
      amount?: null
    ): RemoveLiquidityEventFilter;

    "Repay(address,uint256)"(
      borrower?: string | null,
      borrowedAmount?: null
    ): RepayEventFilter;
    Repay(borrower?: string | null, borrowedAmount?: null): RepayEventFilter;
  };

  estimateGas: {};

  populateTransaction: {};
}
