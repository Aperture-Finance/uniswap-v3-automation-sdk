/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  IApertureMMVaultHelper,
  IApertureMMVaultHelperInterface,
} from "../../../contracts/interfaces/IApertureMMVaultHelper";

const _abi = [
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

export class IApertureMMVaultHelper__factory {
  static readonly abi = _abi;
  static createInterface(): IApertureMMVaultHelperInterface {
    return new utils.Interface(_abi) as IApertureMMVaultHelperInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): IApertureMMVaultHelper {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as IApertureMMVaultHelper;
  }
}