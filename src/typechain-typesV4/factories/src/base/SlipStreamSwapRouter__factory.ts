/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  SlipStreamSwapRouter,
  SlipStreamSwapRouterInterface,
} from "../../../src/base/SlipStreamSwapRouter";

const _abi = [
  {
    inputs: [],
    name: "InvalidRouter",
    type: "error",
  },
  {
    inputs: [],
    name: "MismatchETH",
    type: "error",
  },
  {
    inputs: [],
    name: "NotAllowlistedRouter",
    type: "error",
  },
  {
    inputs: [],
    name: "NotWETH9",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
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
    inputs: [],
    name: "WETH9",
    outputs: [
      {
        internalType: "address payable",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "factory",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "isAllowListedRouter",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "npm",
    outputs: [
      {
        internalType: "contract ICommonNonfungiblePositionManager",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
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
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "int256",
        name: "amount0Delta",
        type: "int256",
      },
      {
        internalType: "int256",
        name: "amount1Delta",
        type: "int256",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "uniswapV3SwapCallback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    stateMutability: "payable",
    type: "receive",
  },
] as const;

export class SlipStreamSwapRouter__factory {
  static readonly abi = _abi;
  static createInterface(): SlipStreamSwapRouterInterface {
    return new utils.Interface(_abi) as SlipStreamSwapRouterInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): SlipStreamSwapRouter {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as SlipStreamSwapRouter;
  }
}
