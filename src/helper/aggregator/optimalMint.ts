import {
  ApertureSupportedChainId,
  INonfungiblePositionManager,
  getChainInfo,
} from '@/index';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';
import Big from 'big.js';

import {
  encodeOptimalSwapData,
  getAutomanContract,
  simulateMintOptimal,
} from '../automan';
import { StateOverrides, getERC20Overrides } from '../overrides';
import { computePoolAddress } from '../pool';
import { getApproveTarget } from './index';
import { SwapRoute, quote } from './quote';

/**
 * Get the optimal amount of liquidity to mint for a given pool and token amounts.
 * @param chainId The chain ID.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fee The pool fee tier.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param fromAddress The address to mint from.
 * @param slippage The slippage tolerance.
 * @param provider A JSON RPC provider or a base provider.
 * @param usePool Whether to use the pool or the aggregator for the swap.
 */
export async function optimalMint(
  chainId: ApertureSupportedChainId,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  fee: FeeAmount,
  tickLower: number,
  tickUpper: number,
  fromAddress: string,
  slippage: number,
  provider: JsonRpcProvider | Provider,
  usePool = false,
) {
  if (!token0Amount.currency.sortsBefore(token1Amount.currency)) {
    throw new Error('token0 must be sorted before token1');
  }
  const mintParams = {
    token0: token0Amount.currency.address,
    token1: token1Amount.currency.address,
    fee,
    tickLower,
    tickUpper,
    amount0Desired: token0Amount.quotient.toString(),
    amount1Desired: token1Amount.quotient.toString(),
    amount0Min: 0,
    amount1Min: 0,
    recipient: fromAddress,
    deadline: Math.floor(Date.now() / 1000 + 86400),
  };
  const { aperture_uniswap_v3_automan, optimal_swap_router } =
    getChainInfo(chainId);
  let overrides: StateOverrides | undefined;
  if (provider instanceof JsonRpcProvider) {
    // forge token approvals and balances
    const [token0Overrides, token1Overrides] = await Promise.all([
      getERC20Overrides(
        mintParams.token0,
        fromAddress,
        aperture_uniswap_v3_automan,
        mintParams.amount0Desired,
        provider,
      ),
      getERC20Overrides(
        mintParams.token1,
        fromAddress,
        aperture_uniswap_v3_automan,
        mintParams.amount1Desired,
        provider,
      ),
    ]);
    overrides = {
      ...token0Overrides,
      ...token1Overrides,
    };
  }
  const poolPromise = optimalMintPool(
    chainId,
    provider,
    fromAddress,
    mintParams,
    overrides,
  );
  if (!usePool) {
    if (optimal_swap_router === undefined) {
      return await poolPromise;
    }
    const [poolEstimate, routerEstimate] = await Promise.all([
      poolPromise,
      optimalMintRouter(
        chainId,
        provider,
        fromAddress,
        mintParams,
        slippage,
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

async function optimalMintPool(
  chainId: ApertureSupportedChainId,
  provider: JsonRpcProvider | Provider,
  fromAddress: string,
  mintParams: INonfungiblePositionManager.MintParamsStruct,
  overrides?: StateOverrides,
) {
  const { amount0, amount1, liquidity } = await simulateMintOptimal(
    chainId,
    provider,
    fromAddress,
    mintParams,
    undefined,
    undefined,
    overrides,
  );
  let swapRoute: SwapRoute = [];
  if (mintParams.amount0Desired.toString() !== amount0.toString()) {
    const [fromTokenAddress, toTokenAddress] = new Big(
      mintParams.amount0Desired.toString(),
    ).gt(amount0.toString())
      ? [mintParams.token0, mintParams.token1]
      : [mintParams.token1, mintParams.token0];
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

async function optimalMintRouter(
  chainId: ApertureSupportedChainId,
  provider: JsonRpcProvider | Provider,
  fromAddress: string,
  mintParams: INonfungiblePositionManager.MintParamsStruct,
  slippage: number,
  overrides?: StateOverrides,
) {
  const { swapData, swapRoute } = await getOptimalMintSwapData(
    chainId,
    provider,
    mintParams,
    slippage,
    true,
  );
  const { amount0, amount1, liquidity } = await simulateMintOptimal(
    chainId,
    provider,
    fromAddress,
    mintParams,
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

async function getOptimalMintSwapData(
  chainId: ApertureSupportedChainId,
  provider: JsonRpcProvider | Provider,
  mintParams: INonfungiblePositionManager.MintParamsStruct,
  slippage: number,
  includeRoute?: boolean,
) {
  const { optimal_swap_router, uniswap_v3_factory } = getChainInfo(chainId);
  const automan = getAutomanContract(chainId, provider);
  const approveTarget = await getApproveTarget(chainId);
  // get swap amounts using the same pool
  const { amountIn: poolAmountIn, zeroForOne } = await automan.getOptimalSwap(
    computePoolAddress(
      uniswap_v3_factory,
      mintParams.token0,
      mintParams.token1,
      mintParams.fee as FeeAmount,
    ),
    mintParams.tickLower,
    mintParams.tickUpper,
    mintParams.amount0Desired,
    mintParams.amount1Desired,
  );
  // get a quote from 1inch
  // TODO: If `poolAmountIn` is zero, do not call `quote()` as 1inch server will return an error; instead, simply return empty swap data and route indicating no need to swap.
  const { tx, protocols } = await quote(
    chainId,
    zeroForOne ? mintParams.token0 : mintParams.token1,
    zeroForOne ? mintParams.token1 : mintParams.token0,
    poolAmountIn.toString(),
    optimal_swap_router!,
    slippage * 100,
    includeRoute,
  );
  return {
    swapData: encodeOptimalSwapData(
      chainId,
      mintParams.token0,
      mintParams.token1,
      mintParams.fee as FeeAmount,
      mintParams.tickLower as number,
      mintParams.tickUpper as number,
      zeroForOne,
      approveTarget,
      tx.to,
      tx.data,
    ),
    swapRoute: protocols,
  };
}
