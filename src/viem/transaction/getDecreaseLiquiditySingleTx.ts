import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { RemoveLiquidityOptions } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex, PublicClient, TransactionRequest } from 'viem';

import {
  DecreaseLiquidityParams,
  getAutomanV3DecreaseLiquiditySingleCalldata,
} from '../automan';
import { PositionDetails } from '../position';

/**
 * Generates an unsigned transaction that removes partial or entire liquidity from the specified position and claim accrued fees.
 * @param decreaseLiquidityOptions Remove liquidity options. RemoveLiquidityOptions can be used for decreasing liquidity (<100%).
 * @param recipient The recipient address (connected wallet address).
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param client Viem public client.
 * @param receiveNativeIfApplicable If set to true and the position involves native, send native instead of wrappedNative to `recipient`.
 * @param position Uniswap SDK Position object for the specified position (optional); if undefined, one will be created.
 * @returns The unsigned tx.
 */
export async function getDecreaseLiquiditySingleV3Tx(
  decreaseLiquidityOptions: Omit<RemoveLiquidityOptions, 'collectOptions'>,
  zeroForOne: boolean,
  recipient: string,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  client: PublicClient,
  swapData: Hex,
  positionDetails?: PositionDetails,
  amount0Min: bigint = 0n,
  amount1Min: bigint = 0n,
  token0FeeAmount: bigint = 0n,
  token1FeeAmount: bigint = 0n,
  blockNumber?: bigint,
): Promise<TransactionRequest> {
  if (positionDetails === undefined) {
    positionDetails = await PositionDetails.fromPositionId(
      chainId,
      amm,
      BigInt(decreaseLiquidityOptions.tokenId.toString()),
      client,
      blockNumber,
    );
  }
  // Use BigInt math for precision, not the liquidity in SolverResult
  const liquidityToDecrease =
    (BigInt(positionDetails.liquidity.toString()) *
      BigInt(
        decreaseLiquidityOptions.liquidityPercentage.numerator.toString(),
      )) /
    BigInt(decreaseLiquidityOptions.liquidityPercentage.denominator.toString());
  const decreaseLiquidityParams: DecreaseLiquidityParams = {
    tokenId: BigInt(decreaseLiquidityOptions.tokenId.toString()),
    liquidity: liquidityToDecrease,
    amount0Min,
    amount1Min,
    deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
  };
  const data = getAutomanV3DecreaseLiquiditySingleCalldata(
    decreaseLiquidityParams,
    zeroForOne,
    token0FeeAmount,
    token1FeeAmount,
    swapData,
  );
  return {
    to: getAMMInfo(chainId, amm)!.apertureAutomanV3,
    data,
    from: recipient as Address,
  };
}
