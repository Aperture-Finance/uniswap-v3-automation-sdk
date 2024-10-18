import {
  AutomanV3__factory,
  Automan__factory,
  fractionToBig,
  getLogger,
} from '@/index';
import { ApertureSupportedChainId, computePoolAddress } from '@/index';
import { Pool, Position } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import {
  Address,
  GetContractReturnType,
  PublicClient,
  WalletClient,
} from 'viem';

import { E_Solver, SwapRoute } from '.';
import { getPool } from '..';
import {
  SlipStreamMintParams,
  UniV3MintParams,
  getAutomanContract,
  getAutomanV3Contract,
} from '../automan';
import { SwapPath } from './types';
import { SolverResult } from './types';

export const calcPriceImpact = (
  pool: Pool,
  initAmount0: bigint,
  initAmount1: bigint,
  finalAmount0: bigint,
  finalAmount1: bigint,
) => {
  const currentPoolPrice = fractionToBig(pool.token0Price);
  const exchangePrice =
    initAmount0 === finalAmount0
      ? new Big(0)
      : new Big(finalAmount1.toString())
          .minus(initAmount1.toString())
          .div(new Big(initAmount0.toString()).minus(finalAmount0.toString()));

  return exchangePrice.eq(0)
    ? exchangePrice
    : new Big(exchangePrice).div(currentPoolPrice).minus(1).abs();
};

export const getSwapPath = (
  token0Address: Address,
  token1Address: Address,
  initToken0Amount: bigint,
  initToken1Amount: bigint,
  finalToken0Amount: bigint,
  finalToken1Amount: bigint,
  slippage: number,
): SwapPath => {
  const [tokenIn, tokenOut, amountIn, amountOut] =
    finalToken0Amount > initToken0Amount
      ? [
          token1Address,
          token0Address,
          initToken1Amount - finalToken1Amount,
          finalToken0Amount - initToken0Amount,
        ]
      : [
          token0Address,
          token1Address,
          initToken0Amount - finalToken0Amount,
          finalToken1Amount - initToken1Amount,
        ];

  return {
    tokenIn: tokenIn,
    tokenOut: tokenOut,
    amountIn: amountIn.toString(),
    amountOut: amountOut.toString(),
    minAmountOut: new Big(amountOut.toString()).times(1 - slippage).toFixed(0),
  };
};

export function getOtherTokenAmount(
  address: string,
  amount: string,
  tickLower: number,
  tickUpper: number,
  pool: Pool,
): CurrencyAmount<Token> {
  if (address === pool.token0.address) {
    return Position.fromAmount0({
      pool,
      tickLower,
      tickUpper,
      amount0: amount,
      useFullPrecision: false,
    }).amount1;
  } else if (address === pool.token1.address) {
    return Position.fromAmount1({
      pool,
      tickLower,
      tickUpper,
      amount1: amount,
    }).amount0;
  } else {
    throw new Error('Token address not in pool');
  }
}

function getPercentDifference(a: Big, b: Big) {
  // Check denominator to avoid dividing by 0.
  const denominator = a.add(b).div(2);
  if (denominator.eq(0)) {
    return 0;
  }
  // Return (|a - b| * 100) / (a + b) / 2
  return Number(a.sub(b).abs().mul(100).div(denominator));
}

export const _getOptimalSwapAmount = async (
  getAutomanContractFn: (
    chainId: ApertureSupportedChainId,
    amm: AutomatedMarketMakerEnum,
    publicClient: PublicClient,
  ) =>
    | GetContractReturnType<
        typeof Automan__factory.abi,
        PublicClient | WalletClient
      >
    | GetContractReturnType<
        typeof AutomanV3__factory.abi,
        PublicClient | WalletClient
      >,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  token0: Address,
  token1: Address,
  feeOrTickSpacing: number,
  tickLower: number,
  tickUpper: number,
  amount0Desired: bigint,
  amount1Desired: bigint,
  blockNumber?: bigint,
) => {
  const automan = getAutomanContractFn(chainId, amm, publicClient);
  // get swap amounts using the same pool
  // Try catch because automan.read.getOptimalSwap() may result in out of gas error.
  try {
    const [poolAmountIn, , zeroForOne] = await automan.read.getOptimalSwap(
      [
        computePoolAddress(chainId, amm, token0, token1, feeOrTickSpacing),
        tickLower,
        tickUpper,
        amount0Desired,
        amount1Desired,
      ],
      {
        blockNumber,
      },
    );
    return {
      poolAmountIn,
      zeroForOne,
    };
  } catch (e) {
    // If error, then check whether swap was necessary.
    // If swap isn't necessary, then return 0 poolAmountIn.
    // If swap was necessary, then propagate error.
    const pool = await getPool(
      token0,
      token1,
      feeOrTickSpacing,
      chainId,
      amm,
      publicClient,
      blockNumber,
    );
    const token0Amount = getOtherTokenAmount(
      token1,
      amount1Desired.toString(),
      tickLower,
      tickUpper,
      pool,
    ).quotient;
    const token1Amount = getOtherTokenAmount(
      token0,
      amount0Desired.toString(),
      tickLower,
      tickUpper,
      pool,
    ).quotient;
    const token0PercentDifference = getPercentDifference(
      Big(amount0Desired.toString()),
      Big(token0Amount.toString()),
    );
    const token1PercentDifference = getPercentDifference(
      Big(amount1Desired.toString()),
      Big(token1Amount.toString()),
    );
    getLogger().info('SDK.getOptimalSwapAmount.CheckSwapNecessity', {
      token0PercentDifference,
      token1PercentDifference,
      amount0Desired,
      amount1Desired,
      token0Amount: token0Amount.toString(),
      token1Amount: token1Amount.toString(),
    });
    if (token0PercentDifference < 0.01 || token1PercentDifference < 0.01) {
      return { poolAmountIn: 0n, zeroForOne: false };
    }
    throw e;
  }
};

export const getOptimalSwapAmount = async (
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  token0: Address,
  token1: Address,
  feeOrTickSpacing: number,
  tickLower: number,
  tickUpper: number,
  amount0Desired: bigint,
  amount1Desired: bigint,
  blockNumber?: bigint,
) => {
  return _getOptimalSwapAmount(
    getAutomanContract,
    chainId,
    amm,
    publicClient,
    token0,
    token1,
    feeOrTickSpacing,
    tickLower,
    tickUpper,
    amount0Desired,
    amount1Desired,
    blockNumber,
  );
};

export const getOptimalSwapAmountV3 = async (
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  token0: Address,
  token1: Address,
  feeOrTickSpacing: number,
  tickLower: number,
  tickUpper: number,
  amount0Desired: bigint,
  amount1Desired: bigint,
  blockNumber?: bigint,
) => {
  return _getOptimalSwapAmount(
    getAutomanV3Contract,
    chainId,
    amm,
    publicClient,
    token0,
    token1,
    feeOrTickSpacing,
    tickLower,
    tickUpper,
    amount0Desired,
    amount1Desired,
    blockNumber,
  );
};

export const getSwapRoute = (
  token0: Address,
  token1: Address,
  deltaAmount0: bigint, // final - init
  swapRoute?: SwapRoute,
) => {
  if (swapRoute) {
    return swapRoute;
  }
  swapRoute = [];
  if (deltaAmount0 !== 0n) {
    // need a swap
    const [fromTokenAddress, toTokenAddress] =
      deltaAmount0 < 0 ? [token0, token1] : [token1, token0];
    swapRoute = [
      [
        [
          {
            name: 'Pool',
            part: 100,
            fromTokenAddress: fromTokenAddress,
            toTokenAddress: toTokenAddress,
          },
        ],
      ],
    ];
  }
  return swapRoute;
};

export const buildOptimalSolutions = async (
  solve: (solver: E_Solver) => Promise<SolverResult | null>,
  includeSolvers: E_Solver[],
) => {
  return (await Promise.all(includeSolvers.map(solve))).filter(
    (result): result is SolverResult => result !== null,
  );
};

export function getFeeOrTickSpacingFromMintParams(
  amm: AutomatedMarketMakerEnum,
  mintParams: SlipStreamMintParams | UniV3MintParams,
): number {
  if (amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM) {
    return (mintParams as SlipStreamMintParams).tickSpacing;
  }
  return (mintParams as UniV3MintParams).fee;
}
