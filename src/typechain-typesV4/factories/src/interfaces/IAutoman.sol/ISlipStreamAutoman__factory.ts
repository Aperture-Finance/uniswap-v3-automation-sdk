/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  ISlipStreamAutoman,
  ISlipStreamAutomanInterface,
} from "../../../../src/interfaces/IAutoman.sol/ISlipStreamAutoman";

const _abi = [
  {
    inputs: [],
    name: "FeeLimitExceeded",
    type: "error",
  },
  {
    inputs: [],
    name: "InsufficientAmount",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidRouter",
    type: "error",
  },
  {
    inputs: [],
    name: "NotAllowlistedRouter",
    type: "error",
  },
  {
    inputs: [],
    name: "NotApproved",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address[]",
        name: "controllers",
        type: "address[]",
      },
      {
        indexed: false,
        internalType: "bool[]",
        name: "statuses",
        type: "bool[]",
      },
    ],
    name: "ControllersSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "DecreaseLiquidity",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "feeCollector",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint96",
        name: "feeLimitPips",
        type: "uint96",
      },
    ],
    name: "FeeConfigSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "IncreaseLiquidity",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Mint",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Rebalance",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "RemoveLiquidity",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address[]",
        name: "routers",
        type: "address[]",
      },
      {
        indexed: false,
        internalType: "bool[]",
        name: "statuses",
        type: "bool[]",
      },
    ],
    name: "SetAllowlistedRouters",
    type: "event",
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
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            internalType: "uint128",
            name: "liquidity",
            type: "uint128",
          },
          {
            internalType: "uint256",
            name: "amount0Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
        ],
        internalType:
          "struct ICommonNonfungiblePositionManager.DecreaseLiquidityParams",
        name: "params",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "token0FeeAmount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "token1FeeAmount",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "tokenOut",
            type: "address",
          },
          {
            internalType: "bytes",
            name: "swapData0",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "swapData1",
            type: "bytes",
          },
          {
            internalType: "bool",
            name: "isUnwrapNative",
            type: "bool",
          },
        ],
        internalType: "struct IAutomanCommon.CollectConfig",
        name: "collectConfig",
        type: "tuple",
      },
      {
        components: [
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
        internalType: "struct IAutomanCommon.Permit",
        name: "permit",
        type: "tuple",
      },
    ],
    name: "decreaseLiquidity",
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
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            internalType: "uint128",
            name: "liquidity",
            type: "uint128",
          },
          {
            internalType: "uint256",
            name: "amount0Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
        ],
        internalType:
          "struct ICommonNonfungiblePositionManager.DecreaseLiquidityParams",
        name: "params",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "token0FeeAmount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "token1FeeAmount",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "tokenOut",
            type: "address",
          },
          {
            internalType: "bytes",
            name: "swapData0",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "swapData1",
            type: "bytes",
          },
          {
            internalType: "bool",
            name: "isUnwrapNative",
            type: "bool",
          },
        ],
        internalType: "struct IAutomanCommon.CollectConfig",
        name: "collectConfig",
        type: "tuple",
      },
    ],
    name: "decreaseLiquidity",
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
    stateMutability: "nonpayable",
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
    inputs: [
      {
        internalType: "V3PoolCallee",
        name: "pool",
        type: "address",
      },
      {
        internalType: "int24",
        name: "tickLower",
        type: "int24",
      },
      {
        internalType: "int24",
        name: "tickUpper",
        type: "int24",
      },
      {
        internalType: "uint256",
        name: "amount0Desired",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount1Desired",
        type: "uint256",
      },
    ],
    name: "getOptimalSwap",
    outputs: [
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountOut",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "zeroForOne",
        type: "bool",
      },
      {
        internalType: "uint160",
        name: "sqrtPriceX96",
        type: "uint160",
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
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
        ],
        internalType:
          "struct ICommonNonfungiblePositionManager.IncreaseLiquidityParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "increaseLiquidity",
    outputs: [
      {
        internalType: "uint128",
        name: "liquidity",
        type: "uint128",
      },
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
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
        ],
        internalType:
          "struct ICommonNonfungiblePositionManager.IncreaseLiquidityParams",
        name: "params",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "tokenIn",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenInFeeAmount",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "swapData0",
        type: "bytes",
      },
      {
        internalType: "bytes",
        name: "swapData1",
        type: "bytes",
      },
    ],
    name: "increaseLiquidityFromTokenIn",
    outputs: [
      {
        internalType: "uint128",
        name: "liquidity",
        type: "uint128",
      },
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
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
        ],
        internalType:
          "struct ICommonNonfungiblePositionManager.IncreaseLiquidityParams",
        name: "params",
        type: "tuple",
      },
      {
        internalType: "bytes",
        name: "swapData",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "token0FeeAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "token1FeeAmount",
        type: "uint256",
      },
    ],
    name: "increaseLiquidityOptimal",
    outputs: [
      {
        internalType: "uint128",
        name: "liquidity",
        type: "uint128",
      },
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
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "addressToCheck",
        type: "address",
      },
    ],
    name: "isController",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
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
            name: "token0",
            type: "address",
          },
          {
            internalType: "address",
            name: "token1",
            type: "address",
          },
          {
            internalType: "int24",
            name: "tickSpacing",
            type: "int24",
          },
          {
            internalType: "int24",
            name: "tickLower",
            type: "int24",
          },
          {
            internalType: "int24",
            name: "tickUpper",
            type: "int24",
          },
          {
            internalType: "uint256",
            name: "amount0Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Min",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "recipient",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
          {
            internalType: "uint160",
            name: "sqrtPriceX96",
            type: "uint160",
          },
        ],
        internalType: "struct ISlipStreamNonfungiblePositionManager.MintParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "mint",
    outputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        internalType: "uint128",
        name: "liquidity",
        type: "uint128",
      },
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
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
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
            internalType: "int24",
            name: "tickSpacing",
            type: "int24",
          },
          {
            internalType: "int24",
            name: "tickLower",
            type: "int24",
          },
          {
            internalType: "int24",
            name: "tickUpper",
            type: "int24",
          },
          {
            internalType: "uint256",
            name: "amount0Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Min",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "recipient",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
          {
            internalType: "uint160",
            name: "sqrtPriceX96",
            type: "uint160",
          },
        ],
        internalType: "struct ISlipStreamNonfungiblePositionManager.MintParams",
        name: "params",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "tokenIn",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenInFeeAmount",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "swapData0",
        type: "bytes",
      },
      {
        internalType: "bytes",
        name: "swapData1",
        type: "bytes",
      },
    ],
    name: "mintFromTokenIn",
    outputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        internalType: "uint128",
        name: "liquidity",
        type: "uint128",
      },
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
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
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
            internalType: "int24",
            name: "tickSpacing",
            type: "int24",
          },
          {
            internalType: "int24",
            name: "tickLower",
            type: "int24",
          },
          {
            internalType: "int24",
            name: "tickUpper",
            type: "int24",
          },
          {
            internalType: "uint256",
            name: "amount0Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Min",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "recipient",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
          {
            internalType: "uint160",
            name: "sqrtPriceX96",
            type: "uint160",
          },
        ],
        internalType: "struct ISlipStreamNonfungiblePositionManager.MintParams",
        name: "params",
        type: "tuple",
      },
      {
        internalType: "bytes",
        name: "swapData",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "token0FeeAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "token1FeeAmount",
        type: "uint256",
      },
    ],
    name: "mintOptimal",
    outputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        internalType: "uint128",
        name: "liquidity",
        type: "uint128",
      },
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
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "npm",
    outputs: [
      {
        internalType: "contract ICommonNonfungiblePositionManager",
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
            internalType: "int24",
            name: "tickSpacing",
            type: "int24",
          },
          {
            internalType: "int24",
            name: "tickLower",
            type: "int24",
          },
          {
            internalType: "int24",
            name: "tickUpper",
            type: "int24",
          },
          {
            internalType: "uint256",
            name: "amount0Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Min",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "recipient",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
          {
            internalType: "uint160",
            name: "sqrtPriceX96",
            type: "uint160",
          },
        ],
        internalType: "struct ISlipStreamNonfungiblePositionManager.MintParams",
        name: "params",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "swapData",
        type: "bytes",
      },
      {
        internalType: "bool",
        name: "isCollect",
        type: "bool",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "token0FeeAmount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "token1FeeAmount",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "tokenOut",
            type: "address",
          },
          {
            internalType: "bytes",
            name: "swapData0",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "swapData1",
            type: "bytes",
          },
          {
            internalType: "bool",
            name: "isUnwrapNative",
            type: "bool",
          },
        ],
        internalType: "struct IAutomanCommon.CollectConfig",
        name: "collectConfig",
        type: "tuple",
      },
      {
        components: [
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
        internalType: "struct IAutomanCommon.Permit",
        name: "permit",
        type: "tuple",
      },
    ],
    name: "rebalance",
    outputs: [
      {
        internalType: "uint256",
        name: "newTokenId",
        type: "uint256",
      },
      {
        internalType: "uint128",
        name: "liquidity",
        type: "uint128",
      },
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
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
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
            internalType: "int24",
            name: "tickSpacing",
            type: "int24",
          },
          {
            internalType: "int24",
            name: "tickLower",
            type: "int24",
          },
          {
            internalType: "int24",
            name: "tickUpper",
            type: "int24",
          },
          {
            internalType: "uint256",
            name: "amount0Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Min",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "recipient",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
          {
            internalType: "uint160",
            name: "sqrtPriceX96",
            type: "uint160",
          },
        ],
        internalType: "struct ISlipStreamNonfungiblePositionManager.MintParams",
        name: "params",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "swapData",
        type: "bytes",
      },
      {
        internalType: "bool",
        name: "isCollect",
        type: "bool",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "token0FeeAmount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "token1FeeAmount",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "tokenOut",
            type: "address",
          },
          {
            internalType: "bytes",
            name: "swapData0",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "swapData1",
            type: "bytes",
          },
          {
            internalType: "bool",
            name: "isUnwrapNative",
            type: "bool",
          },
        ],
        internalType: "struct IAutomanCommon.CollectConfig",
        name: "collectConfig",
        type: "tuple",
      },
    ],
    name: "rebalance",
    outputs: [
      {
        internalType: "uint256",
        name: "newTokenId",
        type: "uint256",
      },
      {
        internalType: "uint128",
        name: "liquidity",
        type: "uint128",
      },
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
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
        ],
        internalType:
          "struct ICommonNonfungiblePositionManager.IncreaseLiquidityParams",
        name: "params",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "token0FeeAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "token1FeeAmount",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "swapData",
        type: "bytes",
      },
    ],
    name: "reinvest",
    outputs: [
      {
        internalType: "uint128",
        name: "liquidity",
        type: "uint128",
      },
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
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Desired",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount0Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
        ],
        internalType:
          "struct ICommonNonfungiblePositionManager.IncreaseLiquidityParams",
        name: "params",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "token0FeeAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "token1FeeAmount",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "swapData",
        type: "bytes",
      },
      {
        components: [
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
        internalType: "struct IAutomanCommon.Permit",
        name: "permit",
        type: "tuple",
      },
    ],
    name: "reinvest",
    outputs: [
      {
        internalType: "uint128",
        name: "liquidity",
        type: "uint128",
      },
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
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "routers",
        type: "address[]",
      },
      {
        internalType: "bool[]",
        name: "statuses",
        type: "bool[]",
      },
    ],
    name: "setAllowlistedRouters",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "controllers",
        type: "address[]",
      },
      {
        internalType: "bool[]",
        name: "statuses",
        type: "bool[]",
      },
    ],
    name: "setControllers",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "feeCollector",
            type: "address",
          },
          {
            internalType: "uint96",
            name: "feeLimitPips",
            type: "uint96",
          },
        ],
        internalType: "struct IAutomanCommon.FeeConfig",
        name: "_feeConfig",
        type: "tuple",
      },
    ],
    name: "setFeeConfig",
    outputs: [],
    stateMutability: "nonpayable",
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
    name: "uniswapV3SwapCallback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export class ISlipStreamAutoman__factory {
  static readonly abi = _abi;
  static createInterface(): ISlipStreamAutomanInterface {
    return new utils.Interface(_abi) as ISlipStreamAutomanInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ISlipStreamAutoman {
    return new Contract(address, _abi, signerOrProvider) as ISlipStreamAutoman;
  }
}
