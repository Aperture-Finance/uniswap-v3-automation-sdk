import {
  ApertureSupportedChainId,
  NULL_ADDRESS,
  PermitInfo,
  getAMMInfo,
} from '@/index';
import {
  Position,
  RemoveLiquidityOptions,
} from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, TransactionRequest } from 'viem';

import {
  DecreaseLiquidityParams,
  getAutomanV4DecreaseLiquidityCalldata,
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
 * @param amountOutExpected The expected amount of tokenOut to receive before slippage check, equals to (amountOut ?? 0n) from getDecreaseLiquidityV4SwapInfo().
 * @param token0FeeAmount Fee amount for token0.
 * @param token1FeeAmount Fee amount for token1.
 * @param swapData0 Swap data for swapping token0 to tokenOut.
 * @param swapData1 Swap data for swapping token1 to tokenOut.
 * @param isUnwrapNative Whether to unwrap native currencies
 * @param blockNumber Optional. The block number to simulate the call from.
 * @returns The unsigned tx.
 */
export async function getDecreaseLiquidityV4Tx(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  from: Address,
  positionDetails: PositionDetails,
  decreaseLiquidityOptions: Omit<RemoveLiquidityOptions, 'collectOptions'>,
  tokenOut: Address,
  amountOutExpected: bigint,
  token0FeeAmount: bigint = 0n,
  token1FeeAmount: bigint = 0n,
  swapData0: Hex = '0x',
  swapData1: Hex = '0x',
  isUnwrapNative = true,
  permitInfo?: PermitInfo,
): Promise<TransactionRequest> {
  // Use BigInt math for precision. liquidityToDecrease is not the liquidity from SolverResult, which is only used for comparing swapData.
  const liquidity =
    (BigInt(positionDetails.liquidity.toString()) *
      BigInt(
        decreaseLiquidityOptions.liquidityPercentage.numerator.toString(),
      )) /
    BigInt(decreaseLiquidityOptions.liquidityPercentage.denominator.toString());
  const decrementalPosition = new Position({
    pool: positionDetails.pool,
    liquidity: liquidity.toString(),
    tickLower: positionDetails.tickLower,
    tickUpper: positionDetails.tickUpper,
  });
  const { amount0, amount1 } = decrementalPosition.mintAmountsWithSlippage(
    decreaseLiquidityOptions.slippageTolerance,
  );
  const decreaseLiquidityParams: DecreaseLiquidityParams = {
    tokenId: BigInt(decreaseLiquidityOptions.tokenId.toString()),
    liquidity,
    amount0Min: tokenOut === NULL_ADDRESS ? BigInt(amount0.toString()) : 0n,
    amount1Min: tokenOut === NULL_ADDRESS ? BigInt(amount1.toString()) : 0n,
    deadline: BigInt(decreaseLiquidityOptions.deadline.toString()),
  };
  const tokenOutSlippage = BigInt(
    Big(amountOutExpected.toString())
      .mul(decreaseLiquidityOptions.slippageTolerance.numerator.toString())
      .div(decreaseLiquidityOptions.slippageTolerance.denominator.toString())
      .toFixed(0),
  );
  const tokenOutMin = amountOutExpected - tokenOutSlippage;
  const data = getAutomanV4DecreaseLiquidityCalldata(
    decreaseLiquidityParams,
    tokenOut,
    tokenOut === NULL_ADDRESS ? 0n : tokenOutMin,
    token0FeeAmount,
    token1FeeAmount,
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
