import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { BytesLike } from 'ethers';
import { solidityPack } from 'ethers/lib/utils';

export function encodeOptimalSwapData(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
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
      getAMMInfo(chainId, amm)!.optimalSwapRouter!,
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
