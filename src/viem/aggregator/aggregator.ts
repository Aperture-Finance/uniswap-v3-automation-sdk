import { ApertureSupportedChainId, computePoolAddress } from '@/index';
import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import axios from 'axios';
import Bottleneck from 'bottleneck';
import { Address, PublicClient } from 'viem';

import { MintParams, getAutomanContract } from '../automan';
import { SwapRoute } from '../solver';

const ApiBaseUrl = 'https://1inch-api.aperture.finance';
const headers = {
  Accept: 'application/json',
};

export async function buildRequest(
  chainId: ApertureSupportedChainId,
  methodName: string,
  params: object,
) {
  return limiter.schedule(() =>
    axios.get(apiRequestUrl(chainId, methodName), {
      headers,
      params,
    }),
  );
}

const limiter = new Bottleneck({
  maxConcurrent: 1, // Number of concurrent promises
  minTime: 1500, // Minimum time (in ms) between the start of subsequent promises
});

function apiRequestUrl(chainId: ApertureSupportedChainId, methodName: string) {
  return new URL(`/swap/v5.2/${chainId}/${methodName}`, ApiBaseUrl).toString();
}

export async function getApproveTarget(
  chainId: ApertureSupportedChainId,
): Promise<Address> {
  try {
    return (await buildRequest(chainId, 'approve/spender', {})).data.address;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export const getOptimalSwapAmount = async (
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  mintParams: MintParams,
  blockNumber?: bigint,
) => {
  const automan = getAutomanContract(chainId, amm, publicClient);
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

  return {
    poolAmountIn,
    zeroForOne,
  };
};

export const getSwapRoute = (
  mintParams: MintParams,
  amount0: bigint,
  swapRoute?: SwapRoute,
) => {
  if (swapRoute) {
    return swapRoute;
  }
  swapRoute = [];
  if (mintParams.amount0Desired !== amount0) {
    // need a swap
    const [fromTokenAddress, toTokenAddress] =
      mintParams.amount0Desired > amount0
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
  return swapRoute;
};
