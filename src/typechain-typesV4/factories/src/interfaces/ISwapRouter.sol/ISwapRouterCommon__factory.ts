/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  ISwapRouterCommon,
  ISwapRouterCommonInterface,
} from "../../../../src/interfaces/ISwapRouter.sol/ISwapRouterCommon";

const _abi = [
  {
    inputs: [],
    name: "InvalidRouter",
    type: "error",
  },
  {
    inputs: [],
    name: "NotAllowlistedRouter",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address[]",
        name: "routers",
        type: "address[]",
      },
      {
        indexed: false,
        internalType: "bool[]",
        name: "statuses",
        type: "bool[]",
      },
    ],
    name: "SetAllowlistedRouters",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "routers",
        type: "address[]",
      },
      {
        internalType: "bool[]",
        name: "statuses",
        type: "bool[]",
      },
    ],
    name: "setAllowlistedRouters",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export class ISwapRouterCommon__factory {
  static readonly abi = _abi;
  static createInterface(): ISwapRouterCommonInterface {
    return new utils.Interface(_abi) as ISwapRouterCommonInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ISwapRouterCommon {
    return new Contract(address, _abi, signerOrProvider) as ISwapRouterCommon;
  }
}
