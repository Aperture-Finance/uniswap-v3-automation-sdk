import { ApertureSupportedChainId, getAMMInfo, getLogger } from '@/index';
import axios from 'axios';
import { Address, Hex } from 'viem';

import { encodeOptimalSwapData } from '../automan';
import { limiter } from './common';
import { getSwapPath } from './internal';
import { ISolver } from './types';
import { SwapRoute } from './types';

const ApiBaseUrl = 'https://okx-api.aperture.finance';
const headers = {
  Accept: 'application/json',
};

export async function buildRequest(methodName: string, params: object) {
  return limiter.schedule(() =>
    axios.get(apiRequestUrl(methodName), {
      headers,
      params,
    }),
  );
}

function apiRequestUrl(methodName: string) {
  return new URL(`api/v5/dex/aggregator/${methodName}`, ApiBaseUrl).toString();
}

export async function getOkxApproveTarget(
  chainId: ApertureSupportedChainId,
  tokenContractAddress: string,
  approveAmount: string,
): Promise<Address> {
  try {
    return (
      await buildRequest('approve-transaction', {
        chainId,
        tokenContractAddress,
        approveAmount,
      })
    ).data.data[0].dexContractAddress;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export const getOkxSolver = (): ISolver => {
  return {
    solve: async (props) => {
      const {
        chainId,
        amm,
        token0,
        token1,
        feeOrTickSpacing,
        tickLower,
        tickUpper,
        slippage,
        poolAmountIn,
        zeroForOne,
        isUseOptimalSwapRouter,
      } = props;

      const { optimalSwapRouter, apertureAutomanV4 } = getAMMInfo(
        chainId,
        amm,
      )!;
      const from =
        isUseOptimalSwapRouter == null || isUseOptimalSwapRouter
          ? optimalSwapRouter
          : apertureAutomanV4;
      if (!from) {
        throw new Error('Chain or AMM not supported');
      }

      const [{ toAmount, tx, swapRoute, priceImpact }, approveTarget] =
        await Promise.all([
          getOkxSwap(
            chainId,
            zeroForOne ? token0 : token1,
            zeroForOne ? token1 : token0,
            poolAmountIn.toString(),
            from,
            slippage,
          ),
          getOkxApproveTarget(
            chainId,
            zeroForOne ? token0 : token1,
            poolAmountIn.toString(),
          ),
        ]);
      const [amount0Init, amount1Init, amount0Final, amount1Final] = zeroForOne
        ? [poolAmountIn, 0n, 0n, toAmount]
        : [0n, poolAmountIn, toAmount, 0n];
      return {
        toAmount,
        swapData: encodeOptimalSwapData(
          from,
          token0,
          token1,
          feeOrTickSpacing,
          tickLower,
          tickUpper,
          zeroForOne,
          approveTarget,
          tx.to,
          tx.data,
        ),
        swapPath: getSwapPath(
          token0,
          token1,
          /* initToken0Amount= */ amount0Init,
          /* initToken1Amount= */ amount1Init,
          /* finalToken0Amount= */ amount0Final,
          /* finalToken1Amount= */ amount1Final,
          slippage,
        ),
        swapRoute,
        priceImpact,
      };
    },
  };
};

/**
 * Get a quote and swap data.
 * Api documentation: https://www.okx.com/web3/build/docs/waas/dex-swap
 * @param chainId The chain ID.
 * @param src Contract address of a token to sell
 * @param dst Contract address of a token to buy
 * @param amount Amount of a token to sell, set in minimal divisible units
 * @param from Address of a seller, make sure that this address has approved to spend src in needed amount
 * @param slippage Limit of price slippage you are willing to accept in percentage
 */
export async function getOkxSwap(
  chainId: ApertureSupportedChainId,
  src: string,
  dst: string,
  amount: string,
  from: string,
  slippage: number,
): Promise<{
  toAmount: bigint;
  tx: {
    from: Address;
    to: Address;
    data: Hex;
    value: string;
    gas: string;
    gasPrice: string;
  };
  swapRoute: SwapRoute;
  priceImpact: string;
}> {
  if (amount === '0') {
    throw new Error('amount should greater than 0');
  }
  const swapParams = {
    chainId: chainId.toString(),
    fromTokenAddress: src,
    toTokenAddress: dst,
    amount,
    slippage: slippage.toString(),
    userWalletAddress: from,
  };
  try {
    const swapData = (
      await buildRequest('swap', new URLSearchParams(swapParams))
    ).data.data;
    if (swapData.length < 1) {
      throw new Error(
        `Error: No swap route found with swapParams=${JSON.stringify(swapParams)}`,
      );
    }
    const selectedProtocols: SwapRoute[0][0] = [];
    for (const dexRouter of swapData[0].routerResult.dexRouterList) {
      const routerPercent = Number(dexRouter.routerPercent) / 100;
      for (const subRouter of dexRouter.subRouterList) {
        for (const protocol of subRouter.dexProtocol) {
          selectedProtocols.push({
            name: protocol.dexName,
            part: Number(protocol.percent) * routerPercent,
            fromTokenAddress: subRouter.fromToken.tokenContractAddress,
            toTokenAddress: subRouter.toToken.tokenContractAddress,
          });
        }
      }
    }
    return {
      toAmount: BigInt(swapData[0].routerResult.toTokenAmount),
      tx: swapData[0].tx,
      swapRoute: [[selectedProtocols]],
      priceImpact: swapData[0].routerResult.priceImpactPercentage,
    };
  } catch (e) {
    getLogger().warn('SDK.getOkxSwap.Error', {
      detail: (e as Error).message,
    });

    throw e;
  }
}

/* Get a quote without swap data. Useful because userWalletAddress and slippage not required.
 * Api documentation: https://www.okx.com/web3/build/docs/waas/dex-get-quote
 * @param chainId The chain ID.
 * @param src Contract address of a token to sell
 * @param dst Contract address of a token to buy
 * @param amount Amount of a token to sell, set in minimal divisible units
 */
export async function getOkxQuote(
  chainId: ApertureSupportedChainId,
  src: string,
  dst: string,
  amount: string,
): Promise<{
  fromAmount: string;
  toAmount: string;
}> {
  if (amount === '0') {
    throw new Error('amount should greater than 0');
  }
  // Since liquidity might be 1-sided, swap back to somewhat use 2 exactInQuotes as 1 exactOutQuote
  // 1st exactInQuote for swapping dst to src just to get an estimate on the amount of srcTokens needed
  const quoteParams = {
    chainId: chainId.toString(),
    fromTokenAddress: dst,
    toTokenAddress: src,
    amount,
  };
  try {
    const quoteData = (
      await buildRequest('quote', new URLSearchParams(quoteParams))
    ).data.data;
    if (quoteData.length < 1) {
      getLogger().warn('SDK.getOkxQuote.NoQuoteFound', { quoteParams });
      throw new Error(
        `Error: No quote found with quoteParams=${JSON.stringify(quoteParams)}`,
      );
    }
    // 2nd exactInQuote for swapping src to dst to output fromAmount and toAmount.
    const quoteParams2 = {
      chainId: chainId.toString(),
      fromTokenAddress: src,
      toTokenAddress: dst,
      amount: quoteData[0].toTokenAmount,
    };
    const quoteData2 = (
      await buildRequest('quote', new URLSearchParams(quoteParams2))
    ).data.data;
    if (quoteData2.length < 1) {
      getLogger().warn('SDK.getOkxQuote2.NoQuoteFound', { quoteParams2 });
      throw new Error(
        `Error: No quote found with quoteParams2=${JSON.stringify(quoteParams2)}`,
      );
    }
    return {
      fromAmount: quoteParams2.amount,
      toAmount: quoteData2[0].toTokenAmount,
    };
  } catch (e) {
    const msg = (e as Error).message;
    if (!msg.startsWith('Error: No quote found with quoteParams')) {
      getLogger().error('SDK.getOkxQuote.Error', {
        detail: (e as Error).message,
      });
    }
    throw e;
  }
}
