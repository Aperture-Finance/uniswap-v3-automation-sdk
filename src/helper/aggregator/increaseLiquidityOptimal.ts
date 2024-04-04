import {
  ApertureSupportedChainId,
  INonfungiblePositionManager,
  getAMMInfo,
} from '@/index';
import { IncreaseOptions, Position } from '@aperture_finance/uniswap-v3-sdk';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { BigNumberish } from 'ethers';

import {
  encodeOptimalSwapData,
  getAutomanContract,
  simulateIncreaseLiquidityOptimal,
} from '../automan';
import { StateOverrides, getERC20Overrides } from '../overrides';
import { computePoolAddress } from '../pool';
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
  provider: JsonRpcProvider | Provider,
  position: Position,
  increaseOptions: IncreaseOptions,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  fromAddress: string,
  usePool = false,
) {
  if (!token0Amount.currency.sortsBefore(token1Amount.currency)) {
    throw new Error('token0 must be sorted before token1');
  }
  const increaseParams = {
    tokenId: increaseOptions.tokenId as BigNumberish,
    amount0Desired: token0Amount.quotient.toString(),
    amount1Desired: token1Amount.quotient.toString(),
    amount0Min: 0,
    amount1Min: 0,
    deadline: Math.floor(Date.now() / 1000 + 86400),
  };
  const { apertureAutoman, optimalSwapRouter } = getAMMInfo(chainId, amm)!;
  let overrides: StateOverrides | undefined;
  if (provider instanceof JsonRpcProvider) {
    // forge token approvals and balances
    const [token0Overrides, token1Overrides] = await Promise.all([
      getERC20Overrides(
        token0Amount.currency.address,
        fromAddress,
        apertureAutoman,
        increaseParams.amount0Desired,
        provider,
      ),
      getERC20Overrides(
        token1Amount.currency.address,
        fromAddress,
        apertureAutoman,
        increaseParams.amount1Desired,
        provider,
      ),
    ]);
    overrides = {
      ...token0Overrides,
      ...token1Overrides,
    };
  }
  const poolPromise = increaseLiquidityOptimalPool(
    chainId,
    amm,
    provider,
    fromAddress,
    position,
    increaseParams,
    overrides,
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
        provider,
        fromAddress,
        position,
        increaseParams,
        increaseOptions.slippageTolerance,
        overrides,
      ),
    ]);
    // use the same pool if the quote isn't better
    if (poolEstimate.liquidity.gte(routerEstimate.liquidity)) {
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
  provider: JsonRpcProvider | Provider,
  fromAddress: string,
  position: Position,
  increaseParams: INonfungiblePositionManager.IncreaseLiquidityParamsStruct,
  overrides?: StateOverrides,
) {
  const { amount0, amount1, liquidity } =
    await simulateIncreaseLiquidityOptimal(
      chainId,
      amm,
      provider,
      fromAddress,
      position,
      increaseParams,
      undefined,
      undefined,
      overrides,
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
  provider: JsonRpcProvider | Provider,
  fromAddress: string,
  position: Position,
  increaseParams: INonfungiblePositionManager.IncreaseLiquidityParamsStruct,
  slippage: Percent,
  overrides?: StateOverrides,
) {
  const { swapData, swapRoute } = await getIncreaseLiquidityOptimalSwapData(
    chainId,
    amm,
    provider,
    position,
    increaseParams,
    slippage,
    true,
  );
  const { amount0, amount1, liquidity } =
    await simulateIncreaseLiquidityOptimal(
      chainId,
      amm,
      provider,
      fromAddress,
      position,
      increaseParams,
      swapData,
      undefined,
      overrides,
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
  provider: JsonRpcProvider | Provider,
  position: Position,
  increaseParams: INonfungiblePositionManager.IncreaseLiquidityParamsStruct,
  slippage: Percent,
  includeRoute?: boolean,
) {
  try {
    const { optimalSwapRouter, factory } = getAMMInfo(chainId, amm)!;
    const automan = getAutomanContract(chainId, amm, provider);
    const approveTarget = await getApproveTarget(chainId);
    // get swap amounts using the same pool
    const { amountIn: poolAmountIn, zeroForOne } = await automan.getOptimalSwap(
      computePoolAddress(
        factory,
        position.pool.token0.address,
        position.pool.token1.address,
        position.pool.fee,
      ),
      position.tickLower,
      position.tickUpper,
      increaseParams.amount0Desired,
      increaseParams.amount1Desired,
    );

    // get a quote from 1inch
    const { tx, protocols } = await quote(
      chainId,
      zeroForOne ? position.pool.token0.address : position.pool.token1.address,
      zeroForOne ? position.pool.token1.address : position.pool.token0.address,
      poolAmountIn.toString(),
      optimalSwapRouter!,
      Number(slippage.toFixed()),
      includeRoute,
    );
    return {
      swapData: encodeOptimalSwapData(
        chainId,
        amm,
        position.pool.token0.address,
        position.pool.token1.address,
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
