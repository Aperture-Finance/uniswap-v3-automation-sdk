import { ApertureSupportedChainId, fractionToBig, getAMMInfo } from '@/index';
import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { Pool } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { computePoolAddress } from '../../utils';
import {
  MintParams,
  encodeOptimalSwapData,
  getAutomanContract,
} from '../automan';
import { getApproveTarget } from './aggregator';
import { quote } from './quote';
import { SwapPath, SwapRoute } from './types';

export async function getOptimalMintSwapData(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  mintParams: MintParams,
  slippage: number,
  blockNumber?: bigint,
  includeRoute?: boolean,
): Promise<{
  swapData: Hex;
  swapRoute?: SwapRoute;
}> {
  try {
    const ammInfo = getAMMInfo(chainId, amm)!;
    const automan = getAutomanContract(chainId, amm, publicClient);
    const approveTarget = await getApproveTarget(chainId);
    // get swap amounts using the same pool
    const [poolAmountIn, , zeroForOne] = await automan.read.getOptimalSwap(
      [
        computePoolAddress(
          chainId,
          amm,
          mintParams.token0,
          mintParams.token1,
          mintParams.fee as FeeAmount,
        ),
        mintParams.tickLower,
        mintParams.tickUpper,
        mintParams.amount0Desired,
        mintParams.amount1Desired,
      ],
      {
        blockNumber,
      },
    );

    // get a quote from 1inch
    const { tx, protocols } = await quote(
      chainId,
      zeroForOne ? mintParams.token0 : mintParams.token1,
      zeroForOne ? mintParams.token1 : mintParams.token0,
      poolAmountIn.toString(),
      ammInfo.optimalSwapRouter!,
      slippage * 100,
      includeRoute,
    );
    return {
      swapData: encodeOptimalSwapData(
        chainId,
        amm,
        mintParams.token0,
        mintParams.token1,
        mintParams.fee as FeeAmount,
        mintParams.tickLower,
        mintParams.tickUpper,
        zeroForOne,
        approveTarget,
        tx.to,
        tx.data,
      ),
      swapRoute: protocols,
    };
  } catch (e) {
    console.warn(`Failed to get swap data: ${e}`);
  }
  return {
    swapData: '0x',
  };
}

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
    minAmountOut: new Big(amountOut.toString())
      .times(1 - slippage * 0.01)
      .toFixed(0),
  };
};
