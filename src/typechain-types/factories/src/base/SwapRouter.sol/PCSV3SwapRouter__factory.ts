/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  PCSV3SwapRouter,
  PCSV3SwapRouterInterface,
} from "../../../../src/base/SwapRouter.sol/PCSV3SwapRouter";

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

export class PCSV3SwapRouter__factory {
  static readonly abi = _abi;
  static createInterface(): PCSV3SwapRouterInterface {
    return new utils.Interface(_abi) as PCSV3SwapRouterInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): PCSV3SwapRouter {
    return new Contract(address, _abi, signerOrProvider) as PCSV3SwapRouter;
  }
}
