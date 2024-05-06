import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Hex, PublicClient } from 'viem';
import { Address } from 'viem';

import { computePoolAddress } from '../../utils';
import { getApproveTarget } from '../aggregator';
import { buildRequest } from '../aggregator';
import {
  MintParams,
  encodeOptimalSwapData,
  getAutomanContract,
} from '../automan';
import { ISolver } from './types';
import { SwapRoute } from './types';

export const get1InchSolver = (): ISolver => {
  return {
    optimalMint: async (props) => {
      const { chainId, amm, publicClient, mintParams, slippage, blockNumber } =
        props;

      const { optimalSwapRouter } = getAMMInfo(chainId, amm)!;
      if (optimalSwapRouter) {
        const res = await getOptimalMintSwapData(
          chainId,
          amm,
          publicClient,
          mintParams,
          slippage,
          blockNumber,
          /** includeRoute= */ true,
        );
        if (res.swapData !== '0x') {
          return res;
        }
      }

      throw new Error('1Inch failed to provide swap data');
    },
  };
};

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

/**
 * Get a quote for a swap.
 * @param chainId The chain ID.
 * @param src Contract address of a token to sell
 * @param dst Contract address of a token to buy
 * @param amount Amount of a token to sell, set in minimal divisible units
 * @param from Address of a seller, make sure that this address has approved to spend src in needed amount
 * @param slippage Limit of price slippage you are willing to accept in percentage
 */
export async function quote(
  chainId: ApertureSupportedChainId,
  src: string,
  dst: string,
  amount: string,
  from: string,
  slippage: number,
  includeProtocols?: boolean,
): Promise<{
  toAmount: string;
  tx: {
    from: Address;
    to: Address;
    data: Hex;
    value: string;
    gas: string;
    gasPrice: string;
  };
  protocols?: SwapRoute;
}> {
  if (amount === '0') {
    throw new Error('amount should greater than 0');
  }
  const swapParams = {
    src,
    dst,
    amount,
    from,
    slippage: slippage.toString(),
    disableEstimate: 'true',
    allowPartialFill: 'false',
    includeProtocols: (!!includeProtocols).toString(),
  };
  try {
    return (
      await buildRequest(chainId, 'swap', new URLSearchParams(swapParams))
    ).data;
  } catch (e) {
    console.error(e);
    throw e;
  }
}
