import { ApertureSupportedChainId, getChainInfo } from '@/index';
import { FeeAmount } from '@uniswap/v3-sdk';
import { BigNumberish, BytesLike } from 'ethers';
import { solidityPack } from 'ethers/lib/utils';

export function encodeSwapData(
  chainId: ApertureSupportedChainId,
  router: string,
  approveTarget: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: BigNumberish,
  data: BytesLike,
): string {
  return solidityPack(
    ['address', 'bytes'],
    [
      getChainInfo(chainId).aperture_router_proxy!,
      solidityPack(
        ['address', 'address', 'address', 'address', 'uint256', 'bytes'],
        [router, approveTarget, tokenIn, tokenOut, amountIn, data],
      ),
    ],
  );
}

export function encodeOptimalSwapData(
  chainId: ApertureSupportedChainId,
  token0: string,
  token1: string,
  fee: FeeAmount,
  tickLower: number,
  tickUpper: number,
  zeroForOne: boolean,
  approveTarget: string,
  router: string,
  data: BytesLike,
): string {
  return solidityPack(
    ['address', 'bytes'],
    [
      getChainInfo(chainId).uniswap_v3_optimal_swap_router!,
      solidityPack(
        [
          'address',
          'address',
          'uint24',
          'int24',
          'int24',
          'bool',
          'address',
          'address',
          'bytes',
        ],
        [
          token0,
          token1,
          fee,
          tickLower,
          tickUpper,
          zeroForOne,
          approveTarget,
          router,
          data,
        ],
      ),
    ],
  );
}
