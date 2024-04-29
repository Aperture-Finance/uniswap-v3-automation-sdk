import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { IncreaseOptions, Position } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import { computePoolAddress } from '../../utils';
import {
  IncreaseLiquidityParams,
  encodeOptimalSwapData,
  getAutomanContract,
  simulateIncreaseLiquidityOptimal,
} from '../automan';
import { getApproveTarget } from './index';
import { SwapRoute, quote } from './quote';

/**
 * Get the optimal amount of liquidity to increase for a given pool and token amounts.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param provider A JSON RPC provider or a base provider.
 * @param position The current position to simulate the call from.
 * @param increaseOptions Increase liquidity options.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fromAddress The address to increase liquidity from.
 * @param usePool Whether to use the pool or the aggregator for the swap.
 */
export async function increaseLiquidityOptimal(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  position: Position,
  increaseOptions: IncreaseOptions,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  fromAddress: Address,
  usePool = false,
  blockNumber?: bigint,
) {
  if (!token0Amount.currency.sortsBefore(token1Amount.currency)) {
    throw new Error('token0 must be sorted before token1');
  }
  const increaseParams: IncreaseLiquidityParams = {
    tokenId: BigInt(increaseOptions.tokenId.toString()),
    amount0Desired: BigInt(token0Amount.quotient.toString()),
    amount1Desired: BigInt(token1Amount.quotient.toString()),
    amount0Min: 0n,
    amount1Min: 0n,
    deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
  };
  const { optimalSwapRouter } = getAMMInfo(chainId, amm)!;

  const poolPromise = increaseLiquidityOptimalPool(
    chainId,
    amm,
    publicClient,
    fromAddress,
    position,
    increaseParams,
    blockNumber,
  );
  if (!usePool) {
    if (optimalSwapRouter === undefined) {
      return await poolPromise;
    }
    const [poolEstimate, routerEstimate] = await Promise.all([
      poolPromise,
      increaseLiquidityOptimalRouter(
        chainId,
        amm,
        publicClient,
        fromAddress,
        position,
        increaseParams,
        Number(increaseOptions.slippageTolerance.toFixed()),
      ),
    ]);
    // use the same pool if the quote isn't better
    if (poolEstimate.liquidity >= routerEstimate.liquidity) {
      return poolEstimate;
    } else {
      return routerEstimate;
    }
  } else {
    return await poolPromise;
  }
}

async function increaseLiquidityOptimalPool(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  fromAddress: Address,
  position: Position,
  increaseParams: IncreaseLiquidityParams,
  blockNumber?: bigint,
) {
  const [liquidity, amount0, amount1] = await simulateIncreaseLiquidityOptimal(
    chainId,
    amm,
    publicClient,
    fromAddress,
    position,
    increaseParams,
    /** swapData= */ undefined,
    blockNumber,
  );
  let swapRoute: SwapRoute = [];
  if (increaseParams.amount0Desired.toString() !== amount0.toString()) {
    const [fromTokenAddress, toTokenAddress] = new Big(
      increaseParams.amount0Desired.toString(),
    ).gt(amount0.toString())
      ? [position.pool.token0.address, position.pool.token1.address]
      : [position.pool.token1.address, position.pool.token0.address];
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

  return {
    amount0,
    amount1,
    liquidity,
    swapData: '0x',
    swapRoute,
  };
}

async function increaseLiquidityOptimalRouter(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  fromAddress: Address,
  position: Position,
  increaseParams: IncreaseLiquidityParams,
  slippage: number,
  blockNumber?: bigint,
) {
  const { swapData, swapRoute } = await getIncreaseLiquidityOptimalSwapData(
    chainId,
    amm,
    publicClient,
    position,
    increaseParams,
    slippage,
    /** includeRoute= */ true,
  );
  const [liquidity, amount0, amount1] = await simulateIncreaseLiquidityOptimal(
    chainId,
    amm,
    publicClient,
    fromAddress,
    position,
    increaseParams,
    swapData,
    blockNumber,
  );
  return {
    amount0,
    amount1,
    liquidity,
    swapData,
    swapRoute,
  };
}

async function getIncreaseLiquidityOptimalSwapData(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  position: Position,
  increaseParams: IncreaseLiquidityParams,
  slippage: number,
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

    const [poolAmountIn, , zeroForOne] = await automan.read.getOptimalSwap([
      computePoolAddress(
        chainId,
        amm,
        position.pool.token0.address,
        position.pool.token1.address,
        position.pool.fee,
      ),
      position.tickLower,
      position.tickUpper,
      increaseParams.amount0Desired,
      increaseParams.amount1Desired,
    ]);

    // get a quote from 1inch
    const { tx, protocols } = await quote(
      chainId,
      zeroForOne ? position.pool.token0.address : position.pool.token1.address,
      zeroForOne ? position.pool.token1.address : position.pool.token0.address,
      poolAmountIn.toString(),
      ammInfo.optimalSwapRouter!,
      slippage * 100,
      includeRoute,
    );
    return {
      swapData: encodeOptimalSwapData(
        chainId,
        amm,
        position.pool.token0.address as Address,
        position.pool.token1.address as Address,
        position.pool.fee,
        position.tickLower,
        position.tickUpper,
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
