import { ApertureSupportedChainId, PermitInfo, getAMMInfo } from '@/index';
import { RemoveLiquidityOptions } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex, TransactionRequest } from 'viem';

import {
  DecreaseLiquidityParams,
  getAutomanDecreaseLiquidityToTokenOutCalldata,
} from '../automan';
import { PositionDetails } from '../position';

/**
 * Generates an unsigned transaction that removes partial or entire liquidity from the specified position, claim accrued fees, and swap to tokenOut.
 * @param amm Automated Market Maker.
 * @param chainId Chain id.
 * @param from The from address (connected wallet address).
 * @param positionDetails Uniswap SDK PositionDetails for the specified position.
 * @param decreaseLiquidityOptions Remove liquidity options. RemoveLiquidityOptions can be used for decreasing liquidity (<100%).
 * @param tokenOut The token to swap collected tokens to.
 * @param tokenOutMin Min amount of tokenOut to receive for slippage check.
 * @param token0FeeAmount Fee amount for token0.
 * @param token1FeeAmount Fee amount for token1.
 * @param swapData0 Swap data for swapping token0 to tokenOut.
 * @param swapData1 Swap data for swapping token1 to tokenOut.
 * @param isUnwrapNative Whether to unwrap native currencies
 * @param blockNumber Optional. The block number to simulate the call from.
 * @returns The unsigned tx.
 */
export async function getDecreaseLiquidityToTokenOutTx(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  from: Address,
  positionDetails: PositionDetails,
  decreaseLiquidityOptions: Omit<RemoveLiquidityOptions, 'collectOptions'>,
  tokenOut: Address,
  tokenOutMin: bigint,
  token0FeeAmount: bigint = 0n,
  token1FeeAmount: bigint = 0n,
  swapData0: Hex = '0x',
  swapData1: Hex = '0x',
  isUnwrapNative = true,
  permitInfo?: PermitInfo,
): Promise<TransactionRequest> {
  // Use BigInt math for precision. liquidityToDecrease is not the liquidity from SolverResult, which is only used for comparing swapData.
  const liquidityToDecrease =
    (BigInt(positionDetails.liquidity.toString()) *
      BigInt(
        decreaseLiquidityOptions.liquidityPercentage.numerator.toString(),
      )) /
    BigInt(decreaseLiquidityOptions.liquidityPercentage.denominator.toString());
  const decreaseLiquidityParams: DecreaseLiquidityParams = {
    tokenId: BigInt(decreaseLiquidityOptions.tokenId.toString()),
    liquidity: liquidityToDecrease,
    // amountMins are used as feeAmounts due to stack too deep compiler error.
    amount0Min: token0FeeAmount,
    amount1Min: token1FeeAmount,
    deadline: BigInt(decreaseLiquidityOptions.deadline.toString()),
  };
  const data = getAutomanDecreaseLiquidityToTokenOutCalldata(
    decreaseLiquidityParams,
    tokenOut,
    tokenOutMin,
    swapData0,
    swapData1,
    isUnwrapNative,
    permitInfo,
  );
  return {
    to: getAMMInfo(chainId, amm)!.apertureAutomanV4,
    from,
    data,
  };
}
