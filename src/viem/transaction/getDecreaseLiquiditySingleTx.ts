import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import {
  NonfungiblePositionManager,
  RemoveLiquidityOptions,
} from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex, PublicClient, TransactionRequest } from 'viem';

import { getAutomanV3DecreaseLiquiditySingleCalldata } from '../automan';
import { PositionDetails } from '../position';
import { convertCollectableTokenAmountToExpectedCurrencyOwed } from './transaction';

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
  receiveNativeIfApplicable?: boolean,
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
  const { value } = NonfungiblePositionManager.removeCallParameters(
    positionDetails.position,
    {
      ...decreaseLiquidityOptions,
      // Note that the `collect()` function of the NPM contract takes `CollectOptions` with
      // `expectedCurrencyOwed0` and `expectedCurrencyOwed1` that should include both the
      // decreased principal liquidity and the accrued fees.
      // However, here we only pass the accrued fees in `collectOptions` because the principal
      // liquidity is added to what is passed here by `NonfungiblePositionManager.removeCallParameters()`
      // when constructing the `collect()` call.
      collectOptions: {
        recipient,
        ...convertCollectableTokenAmountToExpectedCurrencyOwed(
          {
            token0Amount: positionDetails.tokensOwed0,
            token1Amount: positionDetails.tokensOwed1,
          },
          chainId,
          positionDetails.token0,
          positionDetails.token1,
          receiveNativeIfApplicable,
        ),
      },
    },
  );
  const decreaseLiquidityParams = {
    tokenId: BigInt(decreaseLiquidityOptions.tokenId.toString()),
    liquidity:
      BigInt(positionDetails.liquidity.toString()) *
      BigInt(decreaseLiquidityOptions.liquidityPercentage.toSignificant()),
    amount0Min,
    amount1Min,
    deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
  };
  const data = getAutomanV3DecreaseLiquiditySingleCalldata(
    decreaseLiquidityParams,
    zeroForOne,
    swapData,
    token0FeeAmount,
    token1FeeAmount,
  );
  return {
    to: getAMMInfo(chainId, amm)!.apertureAutomanV3,
    data,
    value: BigInt(value),
    from: recipient as Address,
  };
}
