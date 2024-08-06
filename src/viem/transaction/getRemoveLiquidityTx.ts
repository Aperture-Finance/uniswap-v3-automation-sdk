import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import {
  NonfungiblePositionManager,
  Position,
  RemoveLiquidityOptions,
} from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { PublicClient, TransactionRequest } from 'viem';

import { PositionDetails, viewCollectableTokenAmounts } from '../position';
import {
  convertCollectableTokenAmountToExpectedCurrencyOwed,
  getTxToNonfungiblePositionManager,
} from './transaction';

/**
 * Generates an unsigned transaction that removes partial or entire liquidity from the specified position and claim accrued fees.
 * @param removeLiquidityOptions Remove liquidity options.
 * @param recipient The recipient address (connected wallet address).
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param client Viem public client.
 * @param receiveNativeEtherIfApplicable If set to true and the position involves ETH, send native ether instead of WETH to `recipient`.
 * @param position Uniswap SDK Position object for the specified position (optional); if undefined, one will be created.
 * @returns The unsigned tx.
 */
export async function getRemoveLiquidityTx(
  removeLiquidityOptions: Omit<RemoveLiquidityOptions, 'collectOptions'>,
  recipient: string,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  client: PublicClient,
  receiveNativeEtherIfApplicable?: boolean,
  position?: Position,
  blockNumber?: bigint,
): Promise<TransactionRequest> {
  if (position === undefined) {
    ({ position } = await PositionDetails.fromPositionId(
      chainId,
      amm,
      BigInt(removeLiquidityOptions.tokenId.toString()),
      client,
      blockNumber,
    ));
  }
  // TODO: `viewCollectableTokenAmounts` calls `getPositionDetails` which is already called in `PositionDetails.fromPositionId`.
  // Consider taking `PositionDetails` or `PositionStateStruct` in place of `position?: Position`.
  const collectableTokenAmount = await viewCollectableTokenAmounts(
    chainId,
    amm,
    BigInt(removeLiquidityOptions.tokenId.toString()),
    client,
    blockNumber,
  );
  const { calldata, value } = NonfungiblePositionManager.removeCallParameters(
    position,
    {
      ...removeLiquidityOptions,
      // Note that the `collect()` function of the NPM contract takes `CollectOptions` with
      // `expectedCurrencyOwed0` and `expectedCurrencyOwed1` that should include both the
      // decreased principal liquidity and the accrued fees.
      // However, here we only pass the accrued fees in `collectOptions` because the principal
      // liquidity is added to what is passed here by `NonfungiblePositionManager.removeCallParameters()`
      // when constructing the `collect()` call.
      collectOptions: {
        recipient,
        ...convertCollectableTokenAmountToExpectedCurrencyOwed(
          collectableTokenAmount,
          chainId,
          position.pool.token0,
          position.pool.token1,
          receiveNativeEtherIfApplicable,
        ),
      },
    },
  );

  return getTxToNonfungiblePositionManager(
    getAMMInfo(chainId, amm)!,
    calldata,
    value,
    recipient,
  );
}
