/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { WETH, WETHInterface } from "../../../../solady/src/tokens/WETH";

const _abi = [
  {
    inputs: [],
    name: "AllowanceOverflow",
    type: "error",
  },
  {
    inputs: [],
    name: "AllowanceUnderflow",
    type: "error",
  },
  {
    inputs: [],
    name: "ETHTransferFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "InsufficientAllowance",
    type: "error",
  },
  {
    inputs: [],
    name: "InsufficientBalance",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidPermit",
    type: "error",
  },
  {
    inputs: [],
    name: "PermitExpired",
    type: "error",
  },
  {
    inputs: [],
    name: "TotalSupplyOverflow",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [
      {
        internalType: "bytes32",
        name: "result",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "result",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "result",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "nonces",
    outputs: [
      {
        internalType: "uint256",
        name: "result",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "uint8",
        name: "v",
        type: "uint8",
      },
      {
        internalType: "bytes32",
        name: "r",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32",
      },
    ],
    name: "permit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "result",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    stateMutability: "payable",
    type: "receive",
  },
] as const;

const _bytecode =
  "0x60808060405234601557610aae908161001b8239f35b600080fdfe60806040526004361015610023575b361561001957600080fd5b610021610a29565b005b60003560e01c806306fdde03146108ef578063095ea7b31461086357806318160ddd1461081f57806323b872dd146107165780632e1a7d4d14610663578063313ce567146106295780633644e5151461055e57806370a082311461050d5780637ecebe00146104bc57806395d89b4114610402578063a9059cbb14610352578063d0e30db014610320578063d505accf146101245763dd62ed3e0361000e573461011f5760407ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011f576100f96109bf565b6101016109e2565b602052637f5e9f20600c5260005260206034600c2054604051908152f35b600080fd5b3461011f5760e07ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011f5761015b6109bf565b6101636109e2565b6084359160643560443560ff8516850361011f5761017f610a05565b60208101907f57726170706564204574686572000000000000000000000000000000000000008252519020908242116103125773ffffffffffffffffffffffffffffffffffffffff80604051951695169565383775081901600e528560005260c06020600c20958654957f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f8252602082019586528660408301967fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc688528b6060850198468a528c608087019330855260a08820602e527f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9885252528688525260a082015220604e526042602c2060005260ff1660205260a43560405260c4356060526020806080600060015afa93853d5103610304577f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9259460209401905585777f5e9f200000000000000000000000000000000000000000176040526034602c2055a3005b63ddafbaef6000526004601cfd5b631a15a3cc6000526004601cfd5b60007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011f57610021610a29565b3461011f5760407ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011f576103896109bf565b602435906387a211a2600c52336000526020600c2080548084116103f45783900390556000526020600c20818154019055602052600c5160601c337fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef602080a3602060405160018152f35b63f4d678b86000526004601cfd5b3461011f5760007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011f57604051604081019080821067ffffffffffffffff83111761048d5761048991604052600481527f5745544800000000000000000000000000000000000000000000000000000000602082015260405191829182610957565b0390f35b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b3461011f5760207ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011f576104f36109bf565b6338377508600c52600052602080600c2054604051908152f35b3461011f5760207ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011f576105446109bf565b6387a211a2600c52600052602080600c2054604051908152f35b3461011f5760007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011f57602060a0610599610a05565b828101907f57726170706564204574686572000000000000000000000000000000000000008252519020604051907f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f8252838201527fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6604082015246606082015230608082015220604051908152f35b3461011f5760007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011f57602060405160128152f35b3461011f5760207ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011f576004356387a211a2600c52336000526020600c20908154918282116103f45781600093039055806805345cdf77eb68f44c54036805345cdf77eb68f44c5580825281337fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef602083a381803892335af11561070857005b63b12d13eb6000526004601cfd5b3461011f5760607ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011f5761074d6109bf565b6107556109e2565b604435908260601b33602052637f5e9f208117600c526034600c2090815491600183016107fa575b506387a211a2915017600c526020600c2080548084116103f45783900390556000526020600c2081815401905560205273ffffffffffffffffffffffffffffffffffffffff600c5160601c91167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef602080a3602060405160018152f35b82851161081157846387a211a2930390558561077d565b6313be252b6000526004601cfd5b3461011f5760007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011f5760206805345cdf77eb68f44c54604051908152f35b3461011f5760407ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011f5761089a6109bf565b60243590602052637f5e9f20600c5233600052806034600c2055600052602c5160601c337f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560206000a3602060405160018152f35b3461011f5760007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011f57610489610929610a05565b7f57726170706564204574686572000000000000000000000000000000000000006020820152604051918291825b9190916020815282519283602083015260005b8481106109a95750507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f8460006040809697860101520116010190565b806020809284010151604082860101520161096a565b6004359073ffffffffffffffffffffffffffffffffffffffff8216820361011f57565b6024359073ffffffffffffffffffffffffffffffffffffffff8216820361011f57565b604051906040820182811067ffffffffffffffff82111761048d57604052600d8252565b6805345cdf77eb68f44c54348101908110610a93576805345cdf77eb68f44c556387a211a2600c52336000526020600c2034815401905534602052600c5160601c60007fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef602080a3565b63e5cfe9576000526004601cfdfea164736f6c634300081a000a";

type WETHConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: WETHConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class WETH__factory extends ContractFactory {
  constructor(...args: WETHConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(overrides?: Overrides & { from?: string }): Promise<WETH> {
    return super.deploy(overrides || {}) as Promise<WETH>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: string }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): WETH {
    return super.attach(address) as WETH;
  }
  override connect(signer: Signer): WETH__factory {
    return super.connect(signer) as WETH__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): WETHInterface {
    return new utils.Interface(_abi) as WETHInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): WETH {
    return new Contract(address, _abi, signerOrProvider) as WETH;
  }
}