/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  FixedPointMathLib,
  FixedPointMathLibInterface,
} from "../../../../solady/src/utils/FixedPointMathLib";

const _abi = [
  {
    inputs: [],
    name: "DivFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "DivWadFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "ExpOverflow",
    type: "error",
  },
  {
    inputs: [],
    name: "FactorialOverflow",
    type: "error",
  },
  {
    inputs: [],
    name: "FullMulDivFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "LnWadUndefined",
    type: "error",
  },
  {
    inputs: [],
    name: "MantissaOverflow",
    type: "error",
  },
  {
    inputs: [],
    name: "MulDivFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "MulWadFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "OutOfDomain",
    type: "error",
  },
  {
    inputs: [],
    name: "RPowOverflow",
    type: "error",
  },
] as const;

const _bytecode =
  "0x6080806040523460175760119081601d823930815050f35b600080fdfe600080fdfea164736f6c6343000816000a";

type FixedPointMathLibConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: FixedPointMathLibConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class FixedPointMathLib__factory extends ContractFactory {
  constructor(...args: FixedPointMathLibConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: string }
  ): Promise<FixedPointMathLib> {
    return super.deploy(overrides || {}) as Promise<FixedPointMathLib>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: string }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): FixedPointMathLib {
    return super.attach(address) as FixedPointMathLib;
  }
  override connect(signer: Signer): FixedPointMathLib__factory {
    return super.connect(signer) as FixedPointMathLib__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): FixedPointMathLibInterface {
    return new utils.Interface(_abi) as FixedPointMathLibInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): FixedPointMathLib {
    return new Contract(address, _abi, signerOrProvider) as FixedPointMathLib;
  }
}
