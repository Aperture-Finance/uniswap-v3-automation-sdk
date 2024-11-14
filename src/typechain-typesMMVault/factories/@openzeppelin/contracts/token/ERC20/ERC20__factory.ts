/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  ERC20,
  ERC20Interface,
} from "../../../../../@openzeppelin/contracts/token/ERC20/ERC20";

const _abi = [
  {
    inputs: [
      {
        internalType: "string",
        name: "name_",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol_",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
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
        name: "value",
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
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
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
        name: "",
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
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
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
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "subtractedValue",
        type: "uint256",
      },
    ],
    name: "decreaseAllowance",
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
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "addedValue",
        type: "uint256",
      },
    ],
    name: "increaseAllowance",
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
        name: "",
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
] as const;

const _bytecode =
  "0x608060405234801561000f575f80fd5b50604051610b8c380380610b8c83398101604081905261002e916100ec565b600361003a83826101d5565b50600461004782826101d5565b50505061028f565b634e487b7160e01b5f52604160045260245ffd5b5f82601f830112610072575f80fd5b81516001600160401b0381111561008b5761008b61004f565b604051601f8201601f19908116603f011681016001600160401b03811182821017156100b9576100b961004f565b6040528181528382016020018510156100d0575f80fd5b8160208501602083015e5f918101602001919091529392505050565b5f80604083850312156100fd575f80fd5b82516001600160401b03811115610112575f80fd5b61011e85828601610063565b602085015190935090506001600160401b0381111561013b575f80fd5b61014785828601610063565b9150509250929050565b600181811c9082168061016557607f821691505b60208210810361018357634e487b7160e01b5f52602260045260245ffd5b50919050565b601f8211156101d057805f5260205f20601f840160051c810160208510156101ae5750805b601f840160051c820191505b818110156101cd575f81556001016101ba565b50505b505050565b81516001600160401b038111156101ee576101ee61004f565b610202816101fc8454610151565b84610189565b6020601f821160018114610234575f831561021d5750848201515b5f19600385901b1c1916600184901b1784556101cd565b5f84815260208120601f198516915b828110156102635787850151825560209485019460019092019101610243565b508482101561028057868401515f19600387901b60f8161c191681555b50505050600190811b01905550565b6108f08061029c5f395ff3fe608060405234801561000f575f80fd5b50600436106100c4575f3560e01c8063395093511161007d578063a457c2d711610058578063a457c2d714610180578063a9059cbb14610193578063dd62ed3e146101a6575f80fd5b8063395093511461013d57806370a082311461015057806395d89b4114610178575f80fd5b806318160ddd116100ad57806318160ddd1461010957806323b872dd1461011b578063313ce5671461012e575f80fd5b806306fdde03146100c8578063095ea7b3146100e6575b5f80fd5b6100d06101de565b6040516100dd9190610760565b60405180910390f35b6100f96100f43660046107b0565b61026e565b60405190151581526020016100dd565b6002545b6040519081526020016100dd565b6100f96101293660046107d8565b610287565b604051601281526020016100dd565b6100f961014b3660046107b0565b6102aa565b61010d61015e366004610812565b6001600160a01b03165f9081526020819052604090205490565b6100d06102e8565b6100f961018e3660046107b0565b6102f7565b6100f96101a13660046107b0565b6103a5565b61010d6101b4366004610832565b6001600160a01b039182165f90815260016020908152604080832093909416825291909152205490565b6060600380546101ed90610863565b80601f016020809104026020016040519081016040528092919081815260200182805461021990610863565b80156102645780601f1061023b57610100808354040283529160200191610264565b820191905f5260205f20905b81548152906001019060200180831161024757829003601f168201915b5050505050905090565b5f3361027b8185856103b2565b60019150505b92915050565b5f336102948582856104d5565b61029f858585610565565b506001949350505050565b335f8181526001602090815260408083206001600160a01b038716845290915281205490919061027b90829086906102e390879061089b565b6103b2565b6060600480546101ed90610863565b335f8181526001602090815260408083206001600160a01b0387168452909152812054909190838110156103985760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f7760448201527f207a65726f00000000000000000000000000000000000000000000000000000060648201526084015b60405180910390fd5b61029f82868684036103b2565b5f3361027b818585610565565b6001600160a01b0383166104145760405162461bcd60e51b8152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646044820152637265737360e01b606482015260840161038f565b6001600160a01b0382166104755760405162461bcd60e51b815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604482015261737360f01b606482015260840161038f565b6001600160a01b038381165f8181526001602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a3505050565b6001600160a01b038381165f908152600160209081526040808320938616835292905220545f19811461055f57818110156105525760405162461bcd60e51b815260206004820152601d60248201527f45524332303a20696e73756666696369656e7420616c6c6f77616e6365000000604482015260640161038f565b61055f84848484036103b2565b50505050565b6001600160a01b0383166105e15760405162461bcd60e51b815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f20616460448201527f6472657373000000000000000000000000000000000000000000000000000000606482015260840161038f565b6001600160a01b0382166106435760405162461bcd60e51b815260206004820152602360248201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260448201526265737360e81b606482015260840161038f565b6001600160a01b0383165f90815260208190526040902054818110156106d15760405162461bcd60e51b815260206004820152602660248201527f45524332303a207472616e7366657220616d6f756e742065786365656473206260448201527f616c616e63650000000000000000000000000000000000000000000000000000606482015260840161038f565b6001600160a01b038085165f9081526020819052604080822085850390559185168152908120805484929061070790849061089b565b92505081905550826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8460405161075391815260200190565b60405180910390a361055f565b602081525f82518060208401528060208501604085015e5f604082850101526040601f19601f83011684010191505092915050565b80356001600160a01b03811681146107ab575f80fd5b919050565b5f80604083850312156107c1575f80fd5b6107ca83610795565b946020939093013593505050565b5f805f606084860312156107ea575f80fd5b6107f384610795565b925061080160208501610795565b929592945050506040919091013590565b5f60208284031215610822575f80fd5b61082b82610795565b9392505050565b5f8060408385031215610843575f80fd5b61084c83610795565b915061085a60208401610795565b90509250929050565b600181811c9082168061087757607f821691505b60208210810361089557634e487b7160e01b5f52602260045260245ffd5b50919050565b8082018082111561028157634e487b7160e01b5f52601160045260245ffdfea2646970667358221220766467b1dbe1bb3c8670b24d5232afdee87de1de3139cdfab39457838d7ecabb64736f6c634300081a0033";

type ERC20ConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: ERC20ConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class ERC20__factory extends ContractFactory {
  constructor(...args: ERC20ConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    name_: string,
    symbol_: string,
    overrides?: Overrides & { from?: string }
  ): Promise<ERC20> {
    return super.deploy(name_, symbol_, overrides || {}) as Promise<ERC20>;
  }
  override getDeployTransaction(
    name_: string,
    symbol_: string,
    overrides?: Overrides & { from?: string }
  ): TransactionRequest {
    return super.getDeployTransaction(name_, symbol_, overrides || {});
  }
  override attach(address: string): ERC20 {
    return super.attach(address) as ERC20;
  }
  override connect(signer: Signer): ERC20__factory {
    return super.connect(signer) as ERC20__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ERC20Interface {
    return new utils.Interface(_abi) as ERC20Interface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): ERC20 {
    return new Contract(address, _abi, signerOrProvider) as ERC20;
  }
}
