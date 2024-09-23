import { fractionToBig } from '@/index';
import { ApertureSupportedChainId, computePoolAddress } from '@/index';
import { Pool } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, PublicClient } from 'viem';

import { E_Solver, SwapRoute } from '.';
import {
  SlipStreamMintParams,
  UniV3MintParams,
  getAutomanContract,
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
  const automan = getAutomanContract(chainId, amm, publicClient);
  // get swap amounts using the same pool
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
