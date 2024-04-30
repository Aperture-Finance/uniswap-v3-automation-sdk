/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  PancakeV3Callback,
  PancakeV3CallbackInterface,
} from "../../../../src/base/Callback.sol/PancakeV3Callback";

const _abi = [
  {
    inputs: [],
    name: "MismatchETH",
    type: "error",
  },
  {
    inputs: [],
    name: "NotWETH9",
    type: "error",
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
    name: "deployer",
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
    name: "npm",
    outputs: [
      {
        internalType: "contract INonfungiblePositionManager",
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
    name: "pancakeV3SwapCallback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    stateMutability: "payable",
    type: "receive",
  },
] as const;

export class PancakeV3Callback__factory {
  static readonly abi = _abi;
  static createInterface(): PancakeV3CallbackInterface {
    return new utils.Interface(_abi) as PancakeV3CallbackInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): PancakeV3Callback {
    return new Contract(address, _abi, signerOrProvider) as PancakeV3Callback;
  }
}
