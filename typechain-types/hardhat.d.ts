/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { ethers } from "ethers";
import {
  FactoryOptions,
  HardhatEthersHelpers as HardhatEthersHelpersBase,
} from "@nomiclabs/hardhat-ethers/types";

import * as Contracts from ".";

declare module "hardhat/types/runtime" {
  interface HardhatEthersHelpers extends HardhatEthersHelpersBase {
    getContractFactory(
      name: "FullMath",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.FullMath__factory>;
    getContractFactory(
      name: "INonfungiblePositionManager",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.INonfungiblePositionManager__factory>;
    getContractFactory(
      name: "LiquidityAmounts",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.LiquidityAmounts__factory>;
    getContractFactory(
      name: "Ownable",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.Ownable__factory>;
    getContractFactory(
      name: "IERC20Metadata",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IERC20Metadata__factory>;
    getContractFactory(
      name: "IERC20",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IERC20__factory>;
    getContractFactory(
      name: "IERC721Enumerable",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IERC721Enumerable__factory>;
    getContractFactory(
      name: "IERC721Metadata",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IERC721Metadata__factory>;
    getContractFactory(
      name: "IERC721",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IERC721__factory>;
    getContractFactory(
      name: "IERC165",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IERC165__factory>;
    getContractFactory(
      name: "IUniswapV3SwapCallback",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IUniswapV3SwapCallback__factory>;
    getContractFactory(
      name: "IUniswapV3Pool",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IUniswapV3Pool__factory>;
    getContractFactory(
      name: "IUniswapV3PoolActions",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IUniswapV3PoolActions__factory>;
    getContractFactory(
      name: "IUniswapV3PoolDerivedState",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IUniswapV3PoolDerivedState__factory>;
    getContractFactory(
      name: "IUniswapV3PoolEvents",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IUniswapV3PoolEvents__factory>;
    getContractFactory(
      name: "IUniswapV3PoolImmutables",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IUniswapV3PoolImmutables__factory>;
    getContractFactory(
      name: "IUniswapV3PoolOwnerActions",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IUniswapV3PoolOwnerActions__factory>;
    getContractFactory(
      name: "IUniswapV3PoolState",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IUniswapV3PoolState__factory>;
    getContractFactory(
      name: "IERC721Permit",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IERC721Permit__factory>;
    getContractFactory(
      name: "IPeripheryImmutableState",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IPeripheryImmutableState__factory>;
    getContractFactory(
      name: "IPeripheryPayments",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IPeripheryPayments__factory>;
    getContractFactory(
      name: "IPoolInitializer",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IPoolInitializer__factory>;
    getContractFactory(
      name: "ERC20",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.ERC20__factory>;
    getContractFactory(
      name: "WETH",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.WETH__factory>;
    getContractFactory(
      name: "FixedPointMathLib",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.FixedPointMathLib__factory>;
    getContractFactory(
      name: "SafeTransferLib",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.SafeTransferLib__factory>;
    getContractFactory(
      name: "Payments",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.Payments__factory>;
    getContractFactory(
      name: "SwapRouter",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.SwapRouter__factory>;
    getContractFactory(
      name: "UniV3Immutables",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.UniV3Immutables__factory>;
    getContractFactory(
      name: "IUniV3Automan",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IUniV3Automan__factory>;
    getContractFactory(
      name: "IUniV3Immutables",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IUniV3Immutables__factory>;
    getContractFactory(
      name: "EphemeralAllPositions",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.EphemeralAllPositions__factory>;
    getContractFactory(
      name: "EphemeralGetPopulatedTicksInRange",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.EphemeralGetPopulatedTicksInRange__factory>;
    getContractFactory(
      name: "EphemeralGetPopulatedTicksInWord",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.EphemeralGetPopulatedTicksInWord__factory>;
    getContractFactory(
      name: "EphemeralGetPosition",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.EphemeralGetPosition__factory>;
    getContractFactory(
      name: "OptimalSwap",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.OptimalSwap__factory>;
    getContractFactory(
      name: "OptimalSwapRouter",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.OptimalSwapRouter__factory>;
    getContractFactory(
      name: "RouterProxy",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.RouterProxy__factory>;
    getContractFactory(
      name: "UniV3Automan",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.UniV3Automan__factory>;

    getContractAt(
      name: "FullMath",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.FullMath>;
    getContractAt(
      name: "INonfungiblePositionManager",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.INonfungiblePositionManager>;
    getContractAt(
      name: "LiquidityAmounts",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.LiquidityAmounts>;
    getContractAt(
      name: "Ownable",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.Ownable>;
    getContractAt(
      name: "IERC20Metadata",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IERC20Metadata>;
    getContractAt(
      name: "IERC20",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IERC20>;
    getContractAt(
      name: "IERC721Enumerable",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IERC721Enumerable>;
    getContractAt(
      name: "IERC721Metadata",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IERC721Metadata>;
    getContractAt(
      name: "IERC721",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IERC721>;
    getContractAt(
      name: "IERC165",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IERC165>;
    getContractAt(
      name: "IUniswapV3SwapCallback",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IUniswapV3SwapCallback>;
    getContractAt(
      name: "IUniswapV3Pool",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IUniswapV3Pool>;
    getContractAt(
      name: "IUniswapV3PoolActions",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IUniswapV3PoolActions>;
    getContractAt(
      name: "IUniswapV3PoolDerivedState",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IUniswapV3PoolDerivedState>;
    getContractAt(
      name: "IUniswapV3PoolEvents",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IUniswapV3PoolEvents>;
    getContractAt(
      name: "IUniswapV3PoolImmutables",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IUniswapV3PoolImmutables>;
    getContractAt(
      name: "IUniswapV3PoolOwnerActions",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IUniswapV3PoolOwnerActions>;
    getContractAt(
      name: "IUniswapV3PoolState",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IUniswapV3PoolState>;
    getContractAt(
      name: "IERC721Permit",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IERC721Permit>;
    getContractAt(
      name: "IPeripheryImmutableState",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IPeripheryImmutableState>;
    getContractAt(
      name: "IPeripheryPayments",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IPeripheryPayments>;
    getContractAt(
      name: "IPoolInitializer",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IPoolInitializer>;
    getContractAt(
      name: "ERC20",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.ERC20>;
    getContractAt(
      name: "WETH",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.WETH>;
    getContractAt(
      name: "FixedPointMathLib",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.FixedPointMathLib>;
    getContractAt(
      name: "SafeTransferLib",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.SafeTransferLib>;
    getContractAt(
      name: "Payments",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.Payments>;
    getContractAt(
      name: "SwapRouter",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.SwapRouter>;
    getContractAt(
      name: "UniV3Immutables",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.UniV3Immutables>;
    getContractAt(
      name: "IUniV3Automan",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IUniV3Automan>;
    getContractAt(
      name: "IUniV3Immutables",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IUniV3Immutables>;
    getContractAt(
      name: "EphemeralAllPositions",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.EphemeralAllPositions>;
    getContractAt(
      name: "EphemeralGetPopulatedTicksInRange",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.EphemeralGetPopulatedTicksInRange>;
    getContractAt(
      name: "EphemeralGetPopulatedTicksInWord",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.EphemeralGetPopulatedTicksInWord>;
    getContractAt(
      name: "EphemeralGetPosition",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.EphemeralGetPosition>;
    getContractAt(
      name: "OptimalSwap",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.OptimalSwap>;
    getContractAt(
      name: "OptimalSwapRouter",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.OptimalSwapRouter>;
    getContractAt(
      name: "RouterProxy",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.RouterProxy>;
    getContractAt(
      name: "UniV3Automan",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.UniV3Automan>;

    // default types
    getContractFactory(
      name: string,
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<ethers.ContractFactory>;
    getContractFactory(
      abi: any[],
      bytecode: ethers.utils.BytesLike,
      signer?: ethers.Signer
    ): Promise<ethers.ContractFactory>;
    getContractAt(
      nameOrAbi: string | any[],
      address: string,
      signer?: ethers.Signer
    ): Promise<ethers.Contract>;
  }
}
