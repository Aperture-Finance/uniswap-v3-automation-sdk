/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  FullMath,
  FullMathInterface,
} from "../../../../@aperture_finance/uni-v3-lib/src/FullMath";

const _abi = [
  {
    inputs: [],
    name: "FullMulDivFailed",
    type: "error",
  },
] as const;

const _bytecode =
  "0x6080806040523460175760119081601d823930815050f35b600080fdfe600080fdfea164736f6c634300081a000a";

type FullMathConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: FullMathConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class FullMath__factory extends ContractFactory {
  constructor(...args: FullMathConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: string }
  ): Promise<FullMath> {
    return super.deploy(overrides || {}) as Promise<FullMath>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: string }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): FullMath {
    return super.attach(address) as FullMath;
  }
  override connect(signer: Signer): FullMath__factory {
    return super.connect(signer) as FullMath__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): FullMathInterface {
    return new utils.Interface(_abi) as FullMathInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): FullMath {
    return new Contract(address, _abi, signerOrProvider) as FullMath;
  }
}
