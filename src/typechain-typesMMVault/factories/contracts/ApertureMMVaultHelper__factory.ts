/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  ApertureMMVaultHelper,
  ApertureMMVaultHelperInterface,
} from "../../contracts/ApertureMMVaultHelper";

const _abi = [
  {
    inputs: [
      {
        internalType: "contract IUniswapV3Factory",
        name: "factory_",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "factory",
    outputs: [
      {
        internalType: "contract IUniswapV3Factory",
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
        name: "ranges_",
        type: "tuple[]",
      },
      {
        internalType: "address",
        name: "token0_",
        type: "address",
      },
      {
        internalType: "address",
        name: "token1_",
        type: "address",
      },
      {
        internalType: "address",
        name: "vaultV2_",
        type: "address",
      },
    ],
    name: "token0AndToken1ByRange",
    outputs: [
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
            internalType: "struct Range",
            name: "range",
            type: "tuple",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        internalType: "struct Amount[]",
        name: "amount0s",
        type: "tuple[]",
      },
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
            internalType: "struct Range",
            name: "range",
            type: "tuple",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        internalType: "struct Amount[]",
        name: "amount1s",
        type: "tuple[]",
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
        name: "ranges_",
        type: "tuple[]",
      },
      {
        internalType: "address",
        name: "token0_",
        type: "address",
      },
      {
        internalType: "address",
        name: "token1_",
        type: "address",
      },
      {
        internalType: "address",
        name: "vaultV2_",
        type: "address",
      },
    ],
    name: "token0AndToken1PlusFeesByRange",
    outputs: [
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
            internalType: "struct Range",
            name: "range",
            type: "tuple",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        internalType: "struct Amount[]",
        name: "amount0s",
        type: "tuple[]",
      },
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
            internalType: "struct Range",
            name: "range",
            type: "tuple",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        internalType: "struct Amount[]",
        name: "amount1s",
        type: "tuple[]",
      },
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
            internalType: "struct Range",
            name: "range",
            type: "tuple",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        internalType: "struct Amount[]",
        name: "fee0s",
        type: "tuple[]",
      },
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
            internalType: "struct Range",
            name: "range",
            type: "tuple",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        internalType: "struct Amount[]",
        name: "fee1s",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IApertureMMVault",
        name: "vault_",
        type: "address",
      },
    ],
    name: "totalLiquidity",
    outputs: [
      {
        components: [
          {
            internalType: "uint128",
            name: "liquidity",
            type: "uint128",
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
        ],
        internalType: "struct PositionLiquidity[]",
        name: "liquidities",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IApertureMMVault",
        name: "vault_",
        type: "address",
      },
    ],
    name: "totalUnderlying",
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
        internalType: "contract IApertureMMVault",
        name: "vault_",
        type: "address",
      },
      {
        internalType: "uint160",
        name: "sqrtPriceX96_",
        type: "uint160",
      },
    ],
    name: "totalUnderlyingAtPrice",
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
        internalType: "contract IApertureMMVault",
        name: "vault_",
        type: "address",
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
        internalType: "contract IApertureMMVault",
        name: "vault_",
        type: "address",
      },
    ],
    name: "totalUnderlyingWithFeesAndLeftOver",
    outputs: [
      {
        components: [
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
          {
            internalType: "uint256",
            name: "leftOver0",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "leftOver1",
            type: "uint256",
          },
        ],
        internalType: "struct UnderlyingOutput",
        name: "underlying",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const _bytecode =
  "0x60a0604052348015600e575f80fd5b50604051611f72380380611f72833981016040819052602b91603b565b6001600160a01b03166080526066565b5f60208284031215604a575f80fd5b81516001600160a01b0381168114605f575f80fd5b9392505050565b608051611eca6100a85f395f8181610145015281816102760152818161048b01528181610c3501528181610ec80152818161124301526115fa0152611eca5ff3fe608060405234801561000f575f80fd5b5060043610610085575f3560e01c8063a754680211610058578063a75468021461012d578063c45a015514610140578063c56326de1461017f578063e9b7218a1461019f575f80fd5b80630f8f2d1d146100895780636ea08e2a146100c15780638fe5a01e146100e9578063943865551461010a575b5f80fd5b61009c6100973660046117a5565b6101fd565b6040805194855260208501939093529183015260608201526080015b60405180910390f35b6100d46100cf3660046117a5565b610414565b604080519283526020830191909152016100b8565b6100fc6100f73660046117d7565b610626565b6040516100b89291906118e8565b61011d6101183660046117d7565b610811565b6040516100b89493929190611915565b6100d461013b36600461196c565b610bbe565b6101677f000000000000000000000000000000000000000000000000000000000000000081565b6040516001600160a01b0390911681526020016100b8565b61019261018d3660046117a5565b610dd3565b6040516100b891906119a3565b6101b26101ad3660046117a5565b61119b565b6040516100b891905f60c082019050825182526020830151602083015260408301516040830152606083015160608301526080830151608083015260a083015160a083015292915050565b5f805f805f6040518060a00160405280876001600160a01b031663617a34196040518163ffffffff1660e01b81526004015f60405180830381865afa158015610248573d5f803e3d5ffd5b505050506040513d5f823e601f3d908101601f1916820160405261026f9190810190611ac0565b81526020017f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03168152602001876001600160a01b0316630dfe16816040518163ffffffff1660e01b8152600401602060405180830381865afa1580156102df573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906103039190611bb7565b6001600160a01b03168152602001876001600160a01b031663d21220a76040518163ffffffff1660e01b8152600401602060405180830381865afa15801561034d573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906103719190611bb7565b6001600160a01b03168152602001876001600160a01b0316815250905073__$3d23d8578387a47facd93bb77f6fe6e81b$__63e56f4d91826040518263ffffffff1660e01b81526004016103c59190611cac565b608060405180830381865af41580156103e0573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906104049190611cbe565b9299919850965090945092505050565b5f805f6040518060a00160405280856001600160a01b031663617a34196040518163ffffffff1660e01b81526004015f60405180830381865afa15801561045d573d5f803e3d5ffd5b505050506040513d5f823e601f3d908101601f191682016040526104849190810190611ac0565b81526020017f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03168152602001856001600160a01b0316630dfe16816040518163ffffffff1660e01b8152600401602060405180830381865afa1580156104f4573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906105189190611bb7565b6001600160a01b03168152602001856001600160a01b031663d21220a76040518163ffffffff1660e01b8152600401602060405180830381865afa158015610562573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906105869190611bb7565b6001600160a01b03168152602001856001600160a01b0316815250905073__$3d23d8578387a47facd93bb77f6fe6e81b$__63e56f4d91826040518263ffffffff1660e01b81526004016105da9190611cac565b608060405180830381865af41580156105f5573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906106199190611cbe565b5091969095509350505050565b6060808567ffffffffffffffff81111561064257610642611a34565b60405190808252806020026020018201604052801561069c57816020015b6040805160a0810182525f9181018281526060820183905260808201839052815260208101919091528152602001906001900390816106605790505b5091508567ffffffffffffffff8111156106b8576106b8611a34565b60405190808252806020026020018201604052801561071257816020015b6040805160a0810182525f9181018281526060820183905260808201839052815260208101919091528152602001906001900390816106d65790505b5090505f5b86811015610806575f8061074488888c8c8781811061073857610738611cf1565b905060600201896115c3565b50509150915060405180604001604052808b8b8681811061076757610767611cf1565b90506060020180360381019061077d9190611d05565b81526020018381525085848151811061079857610798611cf1565b602002602001018190525060405180604001604052808b8b868181106107c0576107c0611cf1565b9050606002018036038101906107d69190611d05565b8152602001828152508484815181106107f1576107f1611cf1565b60209081029190910101525050600101610717565b509550959350505050565b60608080808767ffffffffffffffff81111561082f5761082f611a34565b60405190808252806020026020018201604052801561088957816020015b6040805160a0810182525f91810182815260608201839052608082018390528152602081019190915281526020019060019003908161084d5790505b5093508767ffffffffffffffff8111156108a5576108a5611a34565b6040519080825280602002602001820160405280156108ff57816020015b6040805160a0810182525f9181018281526060820183905260808201839052815260208101919091528152602001906001900390816108c35790505b5092508767ffffffffffffffff81111561091b5761091b611a34565b60405190808252806020026020018201604052801561097557816020015b6040805160a0810182525f9181018281526060820183905260808201839052815260208101919091528152602001906001900390816109395790505b5091508767ffffffffffffffff81111561099157610991611a34565b6040519080825280602002602001820160405280156109eb57816020015b6040805160a0810182525f9181018281526060820183905260808201839052815260208101919091528152602001906001900390816109af5790505b5090505f5b88811015610bb157898982818110610a0a57610a0a611cf1565b905060600201803603810190610a209190611d05565b858281518110610a3257610a32611cf1565b602090810291909101015152898982818110610a5057610a50611cf1565b905060600201803603810190610a669190611d05565b848281518110610a7857610a78611cf1565b602090810291909101015152898982818110610a9657610a96611cf1565b905060600201803603810190610aac9190611d05565b838281518110610abe57610abe611cf1565b602090810291909101015152898982818110610adc57610adc611cf1565b905060600201803603810190610af29190611d05565b828281518110610b0457610b04611cf1565b602090810291909101015152610b2788888c8c8581811061073857610738611cf1565b888581518110610b3957610b39611cf1565b6020026020010151602001888681518110610b5657610b56611cf1565b6020026020010151602001888781518110610b7357610b73611cf1565b6020026020010151602001888881518110610b9057610b90611cf1565b602090810291909101810151019390935292909152919052526001016109f0565b5095509550955095915050565b5f805f6040518060a00160405280866001600160a01b031663617a34196040518163ffffffff1660e01b81526004015f60405180830381865afa158015610c07573d5f803e3d5ffd5b505050506040513d5f823e601f3d908101601f19168201604052610c2e9190810190611ac0565b81526020017f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03168152602001866001600160a01b0316630dfe16816040518163ffffffff1660e01b8152600401602060405180830381865afa158015610c9e573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610cc29190611bb7565b6001600160a01b03168152602001866001600160a01b031663d21220a76040518163ffffffff1660e01b8152600401602060405180830381865afa158015610d0c573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610d309190611bb7565b6001600160a01b03168152602001866001600160a01b0316815250905073__$3d23d8578387a47facd93bb77f6fe6e81b$__63bc42120082866040518363ffffffff1660e01b8152600401610d86929190611d59565b608060405180830381865af4158015610da1573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610dc59190611cbe565b509197909650945050505050565b60605f826001600160a01b031663617a34196040518163ffffffff1660e01b81526004015f60405180830381865afa158015610e11573d5f803e3d5ffd5b505050506040513d5f823e601f3d908101601f19168201604052610e389190810190611ac0565b9050805167ffffffffffffffff811115610e5457610e54611a34565b604051908082528060200260200182016040528015610eb757816020015b610ea46040805180820182525f8082528251606081018452818152602081810183905293810191909152909182015290565b815260200190600190039081610e725790505b5091505f5b8151811015611194575f7f00000000000000000000000000000000000000000000000000000000000000006001600160a01b0316631698ee82866001600160a01b0316630dfe16816040518163ffffffff1660e01b8152600401602060405180830381865afa158015610f31573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610f559190611bb7565b876001600160a01b031663d21220a76040518163ffffffff1660e01b8152600401602060405180830381865afa158015610f91573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610fb59190611bb7565b868681518110610fc757610fc7611cf1565b602090810291909101015160409081015190516001600160e01b031960e086901b1681526001600160a01b03938416600482015292909116602483015262ffffff166044820152606401602060405180830381865afa15801561102c573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906110509190611bb7565b90505f73__$b131e44167300e1b6d47510635310686a7$__635f49415b838887878151811061108157611081611cf1565b60200260200101515f015188888151811061109e5761109e611cf1565b60209081029190910181015101516040516001600160e01b031960e087901b1681526001600160a01b039485166004820152939092166024840152600290810b60448401520b6064820152608401602060405180830381865af4158015611107573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061112b9190611d83565b90506040518060400160405280826fffffffffffffffffffffffffffffffff16815260200185858151811061116257611162611cf1565b602002602001015181525085848151811061117f5761117f611cf1565b60209081029190910101525050600101610ebc565b5050919050565b6111ce6040518060c001604052805f81526020015f81526020015f81526020015f81526020015f81526020015f81525090565b5f6040518060a00160405280846001600160a01b031663617a34196040518163ffffffff1660e01b81526004015f60405180830381865afa158015611215573d5f803e3d5ffd5b505050506040513d5f823e601f3d908101601f1916820160405261123c9190810190611ac0565b81526020017f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03168152602001846001600160a01b0316630dfe16816040518163ffffffff1660e01b8152600401602060405180830381865afa1580156112ac573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906112d09190611bb7565b6001600160a01b03168152602001846001600160a01b031663d21220a76040518163ffffffff1660e01b8152600401602060405180830381865afa15801561131a573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061133e9190611bb7565b6001600160a01b03168152602001846001600160a01b0316815250905073__$3d23d8578387a47facd93bb77f6fe6e81b$__63e56f4d91826040518263ffffffff1660e01b81526004016113929190611cac565b608060405180830381865af41580156113ad573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906113d19190611cbe565b60608601526040808601919091526020808601929092529184526080830151825163065756db60e01b815292516001600160a01b039091169263065756db9260048083019391928290030181865afa15801561142f573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906114539190611db2565b604080830151608084015191516370a0823160e01b81526001600160a01b0392831660048201529116906370a0823190602401602060405180830381865afa1580156114a1573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906114c59190611db2565b6114cf9190611ddd565b82608001818152505080608001516001600160a01b03166342fb9d446040518163ffffffff1660e01b8152600401602060405180830381865afa158015611518573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061153c9190611db2565b606082015160808301516040516370a0823160e01b81526001600160a01b0391821660048201529116906370a0823190602401602060405180830381865afa15801561158a573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906115ae9190611db2565b6115b89190611ddd565b60a083015250919050565b5f805f80866001600160a01b0316886001600160a01b0316106115e75786886115ea565b87875b90985096505f6001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016631698ee828a8a61163160608c0160408d01611df6565b6040516001600160e01b031960e086901b1681526001600160a01b03938416600482015292909116602483015262ffffff166044820152606401602060405180830381865afa158015611686573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906116aa9190611bb7565b905073__$3d23d8578387a47facd93bb77f6fe6e81b$__637c75bd786040518060600160405280896001600160a01b031681526020018a8036038101906116f19190611d05565b8152602001846001600160a01b03168152505f6040518363ffffffff1660e01b8152600401611721929190611e11565b608060405180830381865af415801561173c573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906117609190611cbe565b929750909550935091506117748386611e81565b94506117808285611e81565b935050945094509450949050565b6001600160a01b03811681146117a2575f80fd5b50565b5f602082840312156117b5575f80fd5b81356117c08161178e565b9392505050565b80356117d28161178e565b919050565b5f805f805f608086880312156117eb575f80fd5b853567ffffffffffffffff811115611801575f80fd5b8601601f81018813611811575f80fd5b803567ffffffffffffffff811115611827575f80fd5b88602060608302840101111561183b575f80fd5b60209182019650945061184f9087016117c7565b925061185d604087016117c7565b915061186b606087016117c7565b90509295509295909350565b5f8151808452602084019350602083015f5b828110156118de5781516118c0878251805160020b8252602081015160020b602083015262ffffff60408201511660408301525050565b60209081015160608801526080909601959190910190600101611889565b5093949350505050565b604081525f6118fa6040830185611877565b828103602084015261190c8185611877565b95945050505050565b608081525f6119276080830187611877565b82810360208401526119398187611877565b9050828103604084015261194d8186611877565b905082810360608401526119618185611877565b979650505050505050565b5f806040838503121561197d575f80fd5b82356119888161178e565b915060208301356119988161178e565b809150509250929050565b602080825282518282018190525f918401906040840190835b81811015611a295783516fffffffffffffffffffffffffffffffff815116845260208101519050611a126020850182805160020b8252602081015160020b602083015262ffffff60408201511660408301525050565b5060209390930192608092909201916001016119bc565b509095945050505050565b634e487b7160e01b5f52604160045260245ffd5b6040516060810167ffffffffffffffff81118282101715611a6b57611a6b611a34565b60405290565b604051601f8201601f1916810167ffffffffffffffff81118282101715611a9a57611a9a611a34565b604052919050565b8060020b81146117a2575f80fd5b62ffffff811681146117a2575f80fd5b5f60208284031215611ad0575f80fd5b815167ffffffffffffffff811115611ae6575f80fd5b8201601f81018413611af6575f80fd5b805167ffffffffffffffff811115611b1057611b10611a34565b611b1f60208260051b01611a71565b80828252602082019150602060608402850101925086831115611b40575f80fd5b6020840193505b82841015611bad5760608488031215611b5e575f80fd5b611b66611a48565b8451611b7181611aa2565b81526020850151611b8181611aa2565b60208201526040850151611b9481611ab0565b6040820152825260609390930192602090910190611b47565b9695505050505050565b5f60208284031215611bc7575f80fd5b81516117c08161178e565b805160a080845281519084018190525f9160200190829060c08601905b80831015611c3b57611c24828551805160020b8252602081015160020b602083015262ffffff60408201511660408301525050565b606082019150602084019350600183019250611bef565b5060208501519250611c5860208701846001600160a01b03169052565b60408501519250611c7460408701846001600160a01b03169052565b60608501519250611c9060608701846001600160a01b03169052565b6080850151925061190c60808701846001600160a01b03169052565b602081525f6117c06020830184611bd2565b5f805f8060808587031215611cd1575f80fd5b505082516020840151604085015160609095015191969095509092509050565b634e487b7160e01b5f52603260045260245ffd5b5f6060828403128015611d16575f80fd5b50611d1f611a48565b8235611d2a81611aa2565b81526020830135611d3a81611aa2565b60208201526040830135611d4d81611ab0565b60408201529392505050565b604081525f611d6b6040830185611bd2565b90506001600160a01b03831660208301529392505050565b5f60208284031215611d93575f80fd5b81516fffffffffffffffffffffffffffffffff811681146117c0575f80fd5b5f60208284031215611dc2575f80fd5b5051919050565b634e487b7160e01b5f52601160045260245ffd5b81810381811115611df057611df0611dc9565b92915050565b5f60208284031215611e06575f80fd5b81356117c081611ab0565b82516001600160a01b0316815260208084015160c0830191611e5790840182805160020b8252602081015160020b602083015262ffffff60408201511660408301525050565b506001600160a01b0360408501511660808301526001600160a01b03831660a08301529392505050565b80820180821115611df057611df0611dc956fea264697066735822122022bed042cb7fc4278de2487b4d49f9eb2c1df82631ca914267f6b72326d2708364736f6c634300081a0033";

type ApertureMMVaultHelperConstructorParams =
  | [
      linkLibraryAddresses: ApertureMMVaultHelperLibraryAddresses,
      signer?: Signer
    ]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: ApertureMMVaultHelperConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => {
  return (
    typeof xs[0] === "string" ||
    (Array.isArray as (arg: any) => arg is readonly any[])(xs[0]) ||
    "_isInterface" in xs[0]
  );
};

export class ApertureMMVaultHelper__factory extends ContractFactory {
  constructor(...args: ApertureMMVaultHelperConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      const [linkLibraryAddresses, signer] = args;
      super(
        _abi,
        ApertureMMVaultHelper__factory.linkBytecode(linkLibraryAddresses),
        signer
      );
    }
  }

  static linkBytecode(
    linkLibraryAddresses: ApertureMMVaultHelperLibraryAddresses
  ): string {
    let linkedBytecode = _bytecode;

    linkedBytecode = linkedBytecode.replace(
      new RegExp("__\\$3d23d8578387a47facd93bb77f6fe6e81b\\$__", "g"),
      linkLibraryAddresses["contracts/libraries/Underlying.sol:Underlying"]
        .replace(/^0x/, "")
        .toLowerCase()
    );

    linkedBytecode = linkedBytecode.replace(
      new RegExp("__\\$b131e44167300e1b6d47510635310686a7\\$__", "g"),
      linkLibraryAddresses["contracts/libraries/Position.sol:Position"]
        .replace(/^0x/, "")
        .toLowerCase()
    );

    return linkedBytecode;
  }

  override deploy(
    factory_: string,
    overrides?: Overrides & { from?: string }
  ): Promise<ApertureMMVaultHelper> {
    return super.deploy(
      factory_,
      overrides || {}
    ) as Promise<ApertureMMVaultHelper>;
  }
  override getDeployTransaction(
    factory_: string,
    overrides?: Overrides & { from?: string }
  ): TransactionRequest {
    return super.getDeployTransaction(factory_, overrides || {});
  }
  override attach(address: string): ApertureMMVaultHelper {
    return super.attach(address) as ApertureMMVaultHelper;
  }
  override connect(signer: Signer): ApertureMMVaultHelper__factory {
    return super.connect(signer) as ApertureMMVaultHelper__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ApertureMMVaultHelperInterface {
    return new utils.Interface(_abi) as ApertureMMVaultHelperInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ApertureMMVaultHelper {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as ApertureMMVaultHelper;
  }
}

export interface ApertureMMVaultHelperLibraryAddresses {
  ["contracts/libraries/Underlying.sol:Underlying"]: string;
  ["contracts/libraries/Position.sol:Position"]: string;
}
