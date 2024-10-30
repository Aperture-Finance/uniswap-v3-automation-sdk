/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  Underlying,
  UnderlyingInterface,
} from "../../../contracts/libraries/Underlying";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "current0_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "current1_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalSupply_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount0Max_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount1Max_",
        type: "uint256",
      },
    ],
    name: "computeMintAmounts",
    outputs: [
      {
        internalType: "uint256",
        name: "mintAmount",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint160",
        name: "sqrtRatioX96",
        type: "uint160",
      },
      {
        internalType: "uint160",
        name: "sqrtRatioAX96",
        type: "uint160",
      },
      {
        internalType: "uint160",
        name: "sqrtRatioBX96",
        type: "uint160",
      },
      {
        internalType: "int128",
        name: "liquidity",
        type: "int128",
      },
    ],
    name: "getAmountsForDelta",
    outputs: [
      {
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes32",
            name: "positionId",
            type: "bytes32",
          },
          {
            internalType: "uint160",
            name: "sqrtPriceX96",
            type: "uint160",
          },
          {
            internalType: "contract IUniswapV3Pool",
            name: "pool",
            type: "IUniswapV3Pool",
          },
          {
            internalType: "int24",
            name: "tick",
            type: "int24",
          },
          {
            internalType: "int24",
            name: "lowerTick",
            type: "int24",
          },
          {
            internalType: "int24",
            name: "upperTick",
            type: "int24",
          },
        ],
        internalType: "struct PositionUnderlying",
        name: "positionUnderlying_",
        type: "tuple",
      },
    ],
    name: "getUnderlyingBalances",
    outputs: [
      {
        internalType: "uint256",
        name: "amount0Current",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount1Current",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee1",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes32",
            name: "positionId",
            type: "bytes32",
          },
          {
            internalType: "uint160",
            name: "sqrtPriceX96",
            type: "uint160",
          },
          {
            internalType: "contract IUniswapV3Pool",
            name: "pool",
            type: "IUniswapV3Pool",
          },
          {
            internalType: "int24",
            name: "tick",
            type: "int24",
          },
          {
            internalType: "int24",
            name: "lowerTick",
            type: "int24",
          },
          {
            internalType: "int24",
            name: "upperTick",
            type: "int24",
          },
        ],
        internalType: "struct PositionUnderlying",
        name: "positionUnderlying_",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "mintAmount_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalSupply_",
        type: "uint256",
      },
    ],
    name: "getUnderlyingBalancesMint",
    outputs: [
      {
        internalType: "uint256",
        name: "amount0Current",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount1Current",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee1",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "rawFee0_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "rawFee1_",
        type: "uint256",
      },
      {
        internalType: "uint16",
        name: "managerFeeBPS_",
        type: "uint16",
      },
    ],
    name: "subtractAdminFees",
    outputs: [
      {
        internalType: "uint256",
        name: "fee0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee1",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: "int24",
                name: "lowerTick",
                type: "int24",
              },
              {
                internalType: "int24",
                name: "upperTick",
                type: "int24",
              },
              {
                internalType: "uint24",
                name: "feeTier",
                type: "uint24",
              },
            ],
            internalType: "struct Range[]",
            name: "ranges",
            type: "tuple[]",
          },
          {
            internalType: "contract IUniswapV3Factory",
            name: "factory",
            type: "IUniswapV3Factory",
          },
          {
            internalType: "address",
            name: "token0",
            type: "address",
          },
          {
            internalType: "address",
            name: "token1",
            type: "address",
          },
          {
            internalType: "address",
            name: "self",
            type: "address",
          },
        ],
        internalType: "struct UnderlyingPayload",
        name: "underlyingPayload_",
        type: "tuple",
      },
      {
        internalType: "uint160",
        name: "sqrtPriceX96_",
        type: "uint160",
      },
    ],
    name: "totalUnderlyingAtPriceWithFees",
    outputs: [
      {
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee1",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: "int24",
                name: "lowerTick",
                type: "int24",
              },
              {
                internalType: "int24",
                name: "upperTick",
                type: "int24",
              },
              {
                internalType: "uint24",
                name: "feeTier",
                type: "uint24",
              },
            ],
            internalType: "struct Range[]",
            name: "ranges",
            type: "tuple[]",
          },
          {
            internalType: "contract IUniswapV3Factory",
            name: "factory",
            type: "IUniswapV3Factory",
          },
          {
            internalType: "address",
            name: "token0",
            type: "address",
          },
          {
            internalType: "address",
            name: "token1",
            type: "address",
          },
          {
            internalType: "address",
            name: "self",
            type: "address",
          },
        ],
        internalType: "struct UnderlyingPayload",
        name: "underlyingPayload_",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "mintAmount_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalSupply_",
        type: "uint256",
      },
    ],
    name: "totalUnderlyingForMint",
    outputs: [
      {
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: "int24",
                name: "lowerTick",
                type: "int24",
              },
              {
                internalType: "int24",
                name: "upperTick",
                type: "int24",
              },
              {
                internalType: "uint24",
                name: "feeTier",
                type: "uint24",
              },
            ],
            internalType: "struct Range[]",
            name: "ranges",
            type: "tuple[]",
          },
          {
            internalType: "contract IUniswapV3Factory",
            name: "factory",
            type: "IUniswapV3Factory",
          },
          {
            internalType: "address",
            name: "token0",
            type: "address",
          },
          {
            internalType: "address",
            name: "token1",
            type: "address",
          },
          {
            internalType: "address",
            name: "self",
            type: "address",
          },
        ],
        internalType: "struct UnderlyingPayload",
        name: "underlyingPayload_",
        type: "tuple",
      },
    ],
    name: "totalUnderlyingWithFees",
    outputs: [
      {
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee1",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "self",
            type: "address",
          },
          {
            components: [
              {
                internalType: "int24",
                name: "lowerTick",
                type: "int24",
              },
              {
                internalType: "int24",
                name: "upperTick",
                type: "int24",
              },
              {
                internalType: "uint24",
                name: "feeTier",
                type: "uint24",
              },
            ],
            internalType: "struct Range",
            name: "range",
            type: "tuple",
          },
          {
            internalType: "contract IUniswapV3Pool",
            name: "pool",
            type: "IUniswapV3Pool",
          },
        ],
        internalType: "struct RangeData",
        name: "underlying_",
        type: "tuple",
      },
      {
        internalType: "uint160",
        name: "sqrtPriceX96_",
        type: "uint160",
      },
    ],
    name: "underlying",
    outputs: [
      {
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee1",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "self",
            type: "address",
          },
          {
            components: [
              {
                internalType: "int24",
                name: "lowerTick",
                type: "int24",
              },
              {
                internalType: "int24",
                name: "upperTick",
                type: "int24",
              },
              {
                internalType: "uint24",
                name: "feeTier",
                type: "uint24",
              },
            ],
            internalType: "struct Range",
            name: "range",
            type: "tuple",
          },
          {
            internalType: "contract IUniswapV3Pool",
            name: "pool",
            type: "IUniswapV3Pool",
          },
        ],
        internalType: "struct RangeData",
        name: "underlying_",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "mintAmount_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalSupply_",
        type: "uint256",
      },
    ],
    name: "underlyingMint",
    outputs: [
      {
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee1",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const _bytecode =
  "0x6127c7610034600b8282823980515f1a607314602857634e487b7160e01b5f525f60045260245ffd5b305f52607381538281f3fe73000000000000000000000000000000000000000030146080604052600436106100c4575f3560e01c8063bab6c5691161007d578063c30fc38d11610063578063c30fc38d14610187578063e56f4d91146101a8578063f05adb5e146101bb575f80fd5b8063bab6c56914610161578063bc42120014610174575f80fd5b806348c619c7116100ad57806348c619c7146101135780637c75bd781461013b57806383d7ba9f1461014e575f80fd5b80631f0f6656146100c85780633ba5697814610100575b5f80fd5b6100db6100d6366004612053565b6101ce565b6040805194855260208501939093529183015260608201526080015b60405180910390f35b6100db61010e366004612085565b610350565b6101266101213660046120ae565b6104a8565b604080519283526020830191909152016100f7565b6100db610149366004612190565b610500565b61012661015c3660046122cc565b6106a5565b6100db61016f366004612316565b610a9a565b6100db610182366004612347565b610c3a565b61019a61019536600461238b565b610c58565b6040519081526020016100f7565b6100db6101b63660046123c2565b610d91565b6101266101c9366004612402565b610dae565b5f805f805f805f805f8b604001516001600160a01b031663514ea4bf8d5f01516040518263ffffffff1660e01b815260040161020c91815260200190565b60a060405180830381865afa158015610227573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061024b9190612471565b80955081965082975083985084995050505050506102c56040518060e001604052808681526020018581526020018e604001516001600160a01b03168152602001876001600160801b031681526020018e6060015160020b81526020018e6080015160020b81526020018e60a0015160020b815250610e5b565b90975095506102dd6001600160801b038316886124d9565b96506102f26001600160801b038216876124d9565b95505050505061033e886020015161030d8a608001516110e9565b61031a8b60a001516110e9565b6101c9610339610334876001600160801b03168e8e611502565b6115ae565b611649565b80955081965050505093509350935093565b5f805f805f805f805f89604001516001600160a01b031663514ea4bf8b5f01516040518263ffffffff1660e01b815260040161038e91815260200190565b60a060405180830381865afa1580156103a9573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906103cd9190612471565b9450945094509450945061043d6040518060e001604052808681526020018581526020018c604001516001600160a01b03168152602001876001600160801b031681526020018c6060015160020b81526020018c6080015160020b81526020018c60a0015160020b815250610e5b565b809750819850505061046d8a6020015161045a8c608001516110e9565b6104678d60a001516110e9565b886116ed565b90995097506104856001600160801b038316886124d9565b965061049a6001600160801b038216876124d9565b955050505050509193509193565b5f806127106104bb61ffff8516876124f2565b6104c5919061251d565b6104cf9086612530565b91506127106104e261ffff8516866124f2565b6104ec919061251d565b6104f69085612530565b9050935093915050565b5f805f805f8087604001516001600160a01b0316633850c7bd6040518163ffffffff1660e01b815260040160e060405180830381865afa158015610546573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061056a9190612552565b50508c516020808f0151805191015160405163090477e560e11b81526001600160a01b039093166004840152600291820b6024840152900b60448201529496509294505f9373__$b131e44167300e1b6d47510635310686a7$__9350631208efca92506064019050602060405180830381865af41580156105ed573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061061191906125e9565b90505f6040518060c001604052808381526020015f8b6001600160a01b03161161063b578561063d565b8a5b6001600160a01b031681526020018b604001516001600160a01b031681526020018460020b81526020018b602001515f015160020b81526020018b602001516020015160020b815250905061069181610350565b929d919c509a509098509650505050505050565b5f805f805f5b875151811015610831575f88602001516001600160a01b0316631698ee828a604001518b606001518c5f015186815181106106e8576106e8612600565b602090810291909101015160409081015190517fffffffff0000000000000000000000000000000000000000000000000000000060e086901b1681526001600160a01b03938416600482015292909116602483015262ffffff166044820152606401602060405180830381865afa158015610765573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906107899190612614565b90505f805f806107e660405180606001604052808f608001516001600160a01b031681526020018f5f015189815181106107c5576107c5612600565b60200260200101518152602001876001600160a01b03168152508d8d610a9a565b9350935093509350838a6107fa91906124d9565b9950610806838a6124d9565b985061081282896124d9565b975061081e81886124d9565b965050600190940193506106ab92505050565b505f876080015190505f806108a18585856001600160a01b031663ccdf7a026040518163ffffffff1660e01b8152600401602060405180830381865afa15801561087d573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610121919061262f565b9150915061099589846001600160a01b031663065756db6040518163ffffffff1660e01b8152600401602060405180830381865afa1580156108e5573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061090991906125e9565b6040808e015160808f015191516370a0823160e01b81526001600160a01b0392831660048201529116906370a0823190602401602060405180830381865afa158015610957573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061097b91906125e9565b61098590866124d9565b61098f9190612530565b8a61176e565b61099f90886124d9565b9650610a8189846001600160a01b03166342fb9d446040518163ffffffff1660e01b8152600401602060405180830381865afa1580156109e1573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610a0591906125e9565b60608d015160808e01516040516370a0823160e01b81526001600160a01b0391821660048201529116906370a0823190602401602060405180830381865afa158015610a53573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610a7791906125e9565b61098590856124d9565b610a8b90876124d9565b95505050505050935093915050565b5f805f805f8088604001516001600160a01b0316633850c7bd6040518163ffffffff1660e01b815260040160e060405180830381865afa158015610ae0573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610b049190612552565b5050505050915091505f73__$b131e44167300e1b6d47510635310686a7$__631208efca8b5f01518c602001515f01518d60200151602001516040518463ffffffff1660e01b8152600401610b7b939291906001600160a01b03939093168352600291820b6020840152900b604082015260600190565b602060405180830381865af4158015610b96573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610bba91906125e9565b90505f6040518060c00160405280838152602001856001600160a01b031681526020018c604001516001600160a01b031681526020018460020b81526020018c602001515f015160020b81526020018c602001516020015160020b8152509050610c25818b8b6101ce565b929e919d509b50909950975050505050505050565b5f805f80610c4886866117aa565b9299919850965090945092505050565b5f85158015610c6657505f85115b15610c7d57610c76828587611502565b9050610d88565b84158015610c8a57505f86115b15610c9a57610c76838588611502565b5f86118015610ca857505f85115b15610d40575f610cb9848689611502565b90505f610cc7848789611502565b90505f82118015610cd757505f81115b610d285760405162461bcd60e51b815260206004820152601d60248201527f41706572747572654d4d5661756c74205661756c743a206d696e74203000000060448201526064015b60405180910390fd5b808210610d355780610d37565b815b92505050610d88565b60405162461bcd60e51b815260206004820152601c60248201527f41706572747572654d4d5661756c74205661756c743a2070616e6963000000006044820152606401610d1f565b95945050505050565b5f805f80610d9f855f6117aa565b93509350935093509193509193565b5f80836001600160a01b0316856001600160a01b03161115610dce579293925b846001600160a01b0316866001600160a01b03161015610e0257610dfb610df6868686611b75565b611bba565b9150610e52565b836001600160a01b0316866001600160a01b03161015610e4157610e2a610df6878686611b75565b9150610e3a610df6868886611c0b565b9050610e52565b610e4f610df6868686611c0b565b90505b94509492505050565b5f805f8084604001516001600160a01b031663f30dba938660a001516040518263ffffffff1660e01b8152600401610e9c919060029190910b815260200190565b61010060405180830381865afa158015610eb8573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610edc919061264a565b505050509350935050505f8086604001516001600160a01b031663f30dba938860c001516040518263ffffffff1660e01b8152600401610f25919060029190910b815260200190565b61010060405180830381865afa158015610f41573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610f65919061264a565b505050509350935050505f604051806101200160405280895f0151815260200186815260200184815260200189604001516001600160a01b031663f30583996040518163ffffffff1660e01b8152600401602060405180830381865afa158015610fd1573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610ff591906125e9565b815260200189604001516001600160a01b0316815260200189606001516001600160801b03168152602001896080015160020b81526020018960a0015160020b81526020018960c0015160020b815250905061105081611c3d565b6020808a015183528281018690526040808401859052808b01518151634614131960e01b81529151939a506001600160a01b0316926346141319926004808401939192918290030181865afa1580156110ab573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906110cf91906125e9565b60608201526110dd81611c3d565b95505050505050915091565b5f805f8360020b126110fe578260020b61110b565b8260020b61110b906126e8565b905061111a620d89e719612702565b60020b8111156111505760405162461bcd60e51b81526020600482015260016024820152601560fa1b6044820152606401610d1f565b5f816001165f0361116557600160801b611177565b6ffffcb933bd6fad37aa2d162d1a5940015b70ffffffffffffffffffffffffffffffffff16905060028216156111b65760806111b1826ffff97272373d413259a46990580e213a6124f2565b901c90505b60048216156111e05760806111db826ffff2e50f5f656932ef12357cf3c7fdcc6124f2565b901c90505b600882161561120a576080611205826fffe5caca7e10e4e61c3624eaa0941cd06124f2565b901c90505b601082161561123457608061122f826fffcb9843d60f6159c9db58835c9266446124f2565b901c90505b602082161561125e576080611259826fff973b41fa98c081472e6896dfb254c06124f2565b901c90505b6040821615611288576080611283826fff2ea16466c96a3843ec78b326b528616124f2565b901c90505b60808216156112b25760806112ad826ffe5dee046a99a2a811c461f1969c30536124f2565b901c90505b6101008216156112dd5760806112d8826ffcbe86c7900a88aedcffc83b479aa3a46124f2565b901c90505b610200821615611308576080611303826ff987a7253ac413176f2b074cf7815e546124f2565b901c90505b61040082161561133357608061132e826ff3392b0822b70005940c7a398e4b70f36124f2565b901c90505b61080082161561135e576080611359826fe7159475a2c29b7443b29c7fa6e889d96124f2565b901c90505b611000821615611389576080611384826fd097f3bdfd2022b8845ad8f792aa58256124f2565b901c90505b6120008216156113b45760806113af826fa9f746462d870fdf8a65dc1f90e061e56124f2565b901c90505b6140008216156113df5760806113da826f70d869a156d2a1b890bb3df62baf32f76124f2565b901c90505b61800082161561140a576080611405826f31be135f97d08fd981231505542fcfa66124f2565b901c90505b62010000821615611436576080611431826f09aa508b5b7a84e1c677de54f3e99bc96124f2565b901c90505b6202000082161561146157608061145c826e5d6af8dedb81196699c329225ee6046124f2565b901c90505b6204000082161561148b576080611486826d2216e584f5fa1ea926041bedfe986124f2565b901c90505b620800008216156114b35760806114ae826b048a170391f7dc42444e8fa26124f2565b901c90505b5f8460020b13156114cc576114c9815f1961251d565b90505b6114db64010000000082612722565b156114e75760016114e9565b5f5b6114fa9060ff16602083901c6124d9565b949350505050565b5f80805f19858709858702925082811083820303915050805f03611536575f841161152b575f80fd5b5082900490506115a7565b808411611541575f80fd5b5f848688098519600190810187169687900496828603819004959092119093035f82900391909104909201919091029190911760038402600290811880860282030280860282030280860282030280860282030280860282030280860290910302029150505b9392505050565b5f7f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8211156116455760405162461bcd60e51b815260206004820152602860248201527f53616665436173743a2076616c756520646f65736e27742066697420696e206160448201527f6e20696e743235360000000000000000000000000000000000000000000000006064820152608401610d1f565b5090565b5f6f7fffffffffffffffffffffffffffffff19821280159061167b57506f7fffffffffffffffffffffffffffffff8213155b6116455760405162461bcd60e51b815260206004820152602760248201527f53616665436173743a2076616c756520646f65736e27742066697420696e203160448201527f32382062697473000000000000000000000000000000000000000000000000006064820152608401610d1f565b5f80836001600160a01b0316856001600160a01b0316111561170d579293925b846001600160a01b0316866001600160a01b03161161173157610dfb858585611cc9565b836001600160a01b0316866001600160a01b0316101561176357611756868585611cc9565b9150610e3a858785611d44565b610e4f858585611d44565b5f61177a848484611502565b90505f828061178b5761178b612509565b84860911156115a7575f1981106117a0575f80fd5b80610d8881612735565b5f805f805f5b865151811015611935575f87602001516001600160a01b0316631698ee8289604001518a606001518b5f015186815181106117ed576117ed612600565b602090810291909101015160409081015190517fffffffff0000000000000000000000000000000000000000000000000000000060e086901b1681526001600160a01b03938416600482015292909116602483015262ffffff166044820152606401602060405180830381865afa15801561186a573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061188e9190612614565b90505f805f806118ea60405180606001604052808e608001516001600160a01b031681526020018e5f015189815181106118ca576118ca612600565b60200260200101518152602001876001600160a01b03168152508c610500565b9350935093509350838a6118fe91906124d9565b995061190a838a6124d9565b985061191682896124d9565b975061192281886124d9565b965050600190940193506117b092505050565b505f866080015190505f806119818585856001600160a01b031663ccdf7a026040518163ffffffff1660e01b8152600401602060405180830381865afa15801561087d573d5f803e3d5ffd5b91509150826001600160a01b031663065756db6040518163ffffffff1660e01b8152600401602060405180830381865afa1580156119c1573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906119e591906125e9565b6040808b015160808c015191516370a0823160e01b81526001600160a01b0392831660048201529116906370a0823190602401602060405180830381865afa158015611a33573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190611a5791906125e9565b611a6190846124d9565b611a6b9190612530565b611a7590886124d9565b9650826001600160a01b03166342fb9d446040518163ffffffff1660e01b8152600401602060405180830381865afa158015611ab3573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190611ad791906125e9565b60608a015160808b01516040516370a0823160e01b81526001600160a01b0391821660048201529116906370a0823190602401602060405180830381865afa158015611b25573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190611b4991906125e9565b611b5390836124d9565b611b5d9190612530565b611b6790876124d9565b955050505092959194509250565b5f8082600f0b12611b9a57611b95611b908585856001611d96565b611e6b565b6114fa565b611bb1611b908585611bab8661274d565b5f611d96565b6114fa906126e8565b5f808212156116455760405162461bcd60e51b815260206004820181905260248201527f53616665436173743a2076616c7565206d75737420626520706f7369746976656044820152606401610d1f565b5f8082600f0b12611c2657611b95611b908585856001611e7b565b611bb1611b908585611c378661274d565b5f611e7b565b5f808260e0015160020b8360c0015160020b12611c5f57506020820151611c6c565b5060208201516060830151035b5f83610100015160020b8460c0015160020b1215611c8f57506040830151611c9c565b5060408301516060840151035b5f8183866060015103039050610d888560a001516001600160801b0316865f01518303600160801b611502565b5f826001600160a01b0316846001600160a01b03161115611ce8579192915b6001600160a01b038416611d3a7bffffffffffffffffffffffffffffffff000000000000000000000000606085901b16611d228787612772565b6001600160a01b0316866001600160a01b0316611502565b6114fa919061251d565b5f826001600160a01b0316846001600160a01b03161115611d63579192915b6114fa6001600160801b038316611d7a8686612772565b6001600160a01b03166c01000000000000000000000000611502565b5f836001600160a01b0316856001600160a01b03161115611db5579293925b7bffffffffffffffffffffffffffffffff000000000000000000000000606084901b165f611de38787612772565b6001600160a01b031690505f876001600160a01b031611611e02575f80fd5b83611e3457866001600160a01b0316611e258383896001600160a01b0316611502565b611e2f919061251d565b611e60565b611e60611e4b8383896001600160a01b031661176e565b886001600160a01b0316808204910615150190565b979650505050505050565b5f600160ff1b8210611645575f80fd5b5f836001600160a01b0316856001600160a01b03161115611e9a579293925b81611ebb57611eb66001600160801b038416611d7a8787612772565b610d88565b610d886001600160801b038416611ed28787612772565b6001600160a01b03166c0100000000000000000000000061176e565b634e487b7160e01b5f52604160045260245ffd5b6040516060810167ffffffffffffffff81118282101715611f2557611f25611eee565b60405290565b60405160a0810167ffffffffffffffff81118282101715611f2557611f25611eee565b604051601f8201601f1916810167ffffffffffffffff81118282101715611f7757611f77611eee565b604052919050565b6001600160a01b0381168114611f93575f80fd5b50565b8060020b8114611f93575f80fd5b8035611faf81611f96565b919050565b5f60c08284031215611fc4575f80fd5b60405160c0810167ffffffffffffffff81118282101715611fe757611fe7611eee565b604052823581529050806020830135611fff81611f7f565b6020820152604083013561201281611f7f565b6040820152606083013561202581611f96565b606082015261203660808401611fa4565b608082015261204760a08401611fa4565b60a08201525092915050565b5f805f6101008486031215612066575f80fd5b6120708585611fb4565b9560c0850135955060e0909401359392505050565b5f60c08284031215612095575f80fd5b6115a78383611fb4565b61ffff81168114611f93575f80fd5b5f805f606084860312156120c0575f80fd5b833592506020840135915060408401356120d98161209f565b809150509250925092565b8035611faf81611f7f565b5f606082840312156120ff575f80fd5b612107611f02565b9050813561211481611f96565b8152602082013561212481611f96565b6020820152604082013562ffffff8116811461213e575f80fd5b604082015292915050565b5f60a08284031215612159575f80fd5b612161611f02565b9050813561216e81611f7f565b815261217d83602084016120ef565b6020820152608082013561213e81611f7f565b5f8060c083850312156121a1575f80fd5b6121ab8484612149565b915060a08301356121bb81611f7f565b809150509250929050565b5f60a082840312156121d6575f80fd5b6121de611f2b565b9050813567ffffffffffffffff8111156121f6575f80fd5b8201601f81018413612206575f80fd5b803567ffffffffffffffff81111561222057612220611eee565b61222f60208260051b01611f4e565b80828252602082019150602060608402850101925086831115612250575f80fd5b6020840193505b8284101561227c5761226987856120ef565b8252602082019150606084019350612257565b84525061228e915050602083016120e4565b602082015261229f604083016120e4565b60408201526122b0606083016120e4565b60608201526122c1608083016120e4565b608082015292915050565b5f805f606084860312156122de575f80fd5b833567ffffffffffffffff8111156122f4575f80fd5b612300868287016121c6565b9660208601359650604090950135949350505050565b5f805f60e08486031215612328575f80fd5b6123328585612149565b9560a0850135955060c0909401359392505050565b5f8060408385031215612358575f80fd5b823567ffffffffffffffff81111561236e575f80fd5b61237a858286016121c6565b92505060208301356121bb81611f7f565b5f805f805f60a0868803121561239f575f80fd5b505083359560208501359550604085013594606081013594506080013592509050565b5f602082840312156123d2575f80fd5b813567ffffffffffffffff8111156123e8575f80fd5b6114fa848285016121c6565b80600f0b8114611f93575f80fd5b5f805f8060808587031215612415575f80fd5b843561242081611f7f565b9350602085013561243081611f7f565b9250604085013561244081611f7f565b91506060850135612450816123f4565b939692955090935050565b80516001600160801b0381168114611faf575f80fd5b5f805f805f60a08688031215612485575f80fd5b61248e8661245b565b60208701516040880151919650945092506124ab6060870161245b565b91506124b96080870161245b565b90509295509295909350565b634e487b7160e01b5f52601160045260245ffd5b808201808211156124ec576124ec6124c5565b92915050565b80820281158282048414176124ec576124ec6124c5565b634e487b7160e01b5f52601260045260245ffd5b5f8261252b5761252b612509565b500490565b818103818111156124ec576124ec6124c5565b80518015158114611faf575f80fd5b5f805f805f805f60e0888a031215612568575f80fd5b875161257381611f7f565b602089015190975061258481611f96565b60408901519096506125958161209f565b60608901519095506125a68161209f565b60808901519094506125b78161209f565b60a089015190935060ff811681146125cd575f80fd5b91506125db60c08901612543565b905092959891949750929550565b5f602082840312156125f9575f80fd5b5051919050565b634e487b7160e01b5f52603260045260245ffd5b5f60208284031215612624575f80fd5b81516115a781611f7f565b5f6020828403121561263f575f80fd5b81516115a78161209f565b5f805f805f805f80610100898b031215612662575f80fd5b61266b8961245b565b9750602089015161267b816123f4565b60408a015160608b015160808c01519299509097509550600681900b81146126a1575f80fd5b60a08a01519094506126b281611f7f565b60c08a015190935063ffffffff811681146126cb575f80fd5b91506126d960e08a01612543565b90509295985092959890939650565b5f600160ff1b82016126fc576126fc6124c5565b505f0390565b5f8160020b627fffff19810361271a5761271a6124c5565b5f0392915050565b5f8261273057612730612509565b500690565b5f60018201612746576127466124c5565b5060010190565b5f81600f0b6f7fffffffffffffffffffffffffffffff19810361271a5761271a6124c5565b6001600160a01b0382811682821603908111156124ec576124ec6124c556fea26469706673582212204beb12cf1db59060edc07c39dba74c1fbd1d502f78921f5a72a6bbd8e34a185364736f6c634300081a0033";

type UnderlyingConstructorParams =
  | [linkLibraryAddresses: UnderlyingLibraryAddresses, signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: UnderlyingConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => {
  return (
    typeof xs[0] === "string" ||
    (Array.isArray as (arg: any) => arg is readonly any[])(xs[0]) ||
    "_isInterface" in xs[0]
  );
};

export class Underlying__factory extends ContractFactory {
  constructor(...args: UnderlyingConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      const [linkLibraryAddresses, signer] = args;
      super(
        _abi,
        Underlying__factory.linkBytecode(linkLibraryAddresses),
        signer
      );
    }
  }

  static linkBytecode(
    linkLibraryAddresses: UnderlyingLibraryAddresses
  ): string {
    let linkedBytecode = _bytecode;

    linkedBytecode = linkedBytecode.replace(
      new RegExp("__\\$b131e44167300e1b6d47510635310686a7\\$__", "g"),
      linkLibraryAddresses["contracts/libraries/Position.sol:Position"]
        .replace(/^0x/, "")
        .toLowerCase()
    );

    return linkedBytecode;
  }

  override deploy(
    overrides?: Overrides & { from?: string }
  ): Promise<Underlying> {
    return super.deploy(overrides || {}) as Promise<Underlying>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: string }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): Underlying {
    return super.attach(address) as Underlying;
  }
  override connect(signer: Signer): Underlying__factory {
    return super.connect(signer) as Underlying__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): UnderlyingInterface {
    return new utils.Interface(_abi) as UnderlyingInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): Underlying {
    return new Contract(address, _abi, signerOrProvider) as Underlying;
  }
}

export interface UnderlyingLibraryAddresses {
  ["contracts/libraries/Position.sol:Position"]: string;
}
