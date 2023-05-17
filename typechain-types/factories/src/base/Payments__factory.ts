/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type { Payments, PaymentsInterface } from "../../../src/base/Payments";

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
    stateMutability: "payable",
    type: "receive",
  },
] as const;

export class Payments__factory {
  static readonly abi = _abi;
  static createInterface(): PaymentsInterface {
    return new utils.Interface(_abi) as PaymentsInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): Payments {
    return new Contract(address, _abi, signerOrProvider) as Payments;
  }
}
