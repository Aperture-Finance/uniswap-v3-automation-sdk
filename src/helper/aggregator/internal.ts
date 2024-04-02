import {
  ApertureSupportedChainId,
  INonfungiblePositionManager,
  getAMMInfo,
} from '@/index';
import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import axios from 'axios';
import Bottleneck from 'bottleneck';

import { encodeOptimalSwapData, getAutomanContract } from '../automan';
import { computePoolAddress } from '../pool';
import { getApproveTarget } from './index';
import { SwapRoute, quote } from './quote';

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

export async function getOptimalMintSwapData(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  provider: JsonRpcProvider | Provider,
  mintParams: INonfungiblePositionManager.MintParamsStruct,
  slippage: number,
  blockNumber?: number,
  includeRoute?: boolean,
): Promise<{
  swapData: string;
  swapRoute?: SwapRoute;
}> {
  try {
    const { optimalSwapRouter, factory } = getAMMInfo(
      chainId, amm,
    )!;
    const automan = getAutomanContract(chainId, provider);
    const approveTarget = await getApproveTarget(chainId);
    // get swap amounts using the same pool
    const { amountIn: poolAmountIn, zeroForOne } = await automan.getOptimalSwap(
      computePoolAddress(
        factory,
        mintParams.token0,
        mintParams.token1,
        mintParams.fee as FeeAmount,
      ),
      mintParams.tickLower,
      mintParams.tickUpper,
      mintParams.amount0Desired,
      mintParams.amount1Desired,
      {
        blockTag: blockNumber,
      },
    );

    // get a quote from 1inch
    const { tx, protocols } = await quote(
      chainId,
      zeroForOne ? mintParams.token0 : mintParams.token1,
      zeroForOne ? mintParams.token1 : mintParams.token0,
      poolAmountIn.toString(),
      optimalSwapRouter!,
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
  } catch (e) {
    console.warn(`Failed to get swap data: ${e}`);
  }
  return {
    swapData: '0x',
  };
}
