/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  SafeTransferLib,
  SafeTransferLibInterface,
} from "../../../../solady/src/utils/SafeTransferLib";

const _abi = [
  {
    inputs: [],
    name: "ApproveFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "ETHTransferFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "TransferFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "TransferFromFailed",
    type: "error",
  },
] as const;

const _bytecode =
  "0x6080806040523460175760399081601c823930815050f35b5f80fdfe5f80fdfea264697066735822122073acdb20125ec70d5cce41b93a15ab04870654174025179d3f1801be9e779e7164736f6c63430008140033";

type SafeTransferLibConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: SafeTransferLibConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class SafeTransferLib__factory extends ContractFactory {
  constructor(...args: SafeTransferLibConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: string }
  ): Promise<SafeTransferLib> {
    return super.deploy(overrides || {}) as Promise<SafeTransferLib>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: string }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): SafeTransferLib {
    return super.attach(address) as SafeTransferLib;
  }
  override connect(signer: Signer): SafeTransferLib__factory {
    return super.connect(signer) as SafeTransferLib__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): SafeTransferLibInterface {
    return new utils.Interface(_abi) as SafeTransferLibInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): SafeTransferLib {
    return new Contract(address, _abi, signerOrProvider) as SafeTransferLib;
  }
}
