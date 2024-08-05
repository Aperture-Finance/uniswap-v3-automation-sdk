import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { NonfungiblePositionManager } from '@aperture_finance/uniswap-v3-sdk';
import { viem } from 'aperture-lens';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { PublicClient, TransactionRequest } from 'viem';

import {
  PositionDetails,
  PositionStateStruct,
  viewCollectableTokenAmounts,
} from '../position';
import {
  convertCollectableTokenAmountToExpectedCurrencyOwed,
  getTxToNonfungiblePositionManager,
} from './transaction';

/**
 * Generates an unsigned transaction that collects tokens from the specified position.
 * @param positionId Position id.
 * @param recipient The recipient address (connected wallet address).
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param client Viem Public client.
 * @param receiveNativeEtherIfApplicable If set to true and the position involves ETH, send native ether instead of WETH to `recipient`.
 * @param basicPositionInfo Basic position info (optional); if undefined, one will be created.
 * @returns The unsigned tx.
 */
export async function getCollectTx(
  positionId: bigint,
  recipient: string,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  client: PublicClient,
  receiveNativeEtherIfApplicable?: boolean,
  positionState?: PositionStateStruct,
): Promise<TransactionRequest> {
  if (positionState === undefined) {
    positionState = await viem.getPositionDetails(
      amm,
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      positionId,
      client,
    );
  }
  const collectableTokenAmount = await viewCollectableTokenAmounts(
    chainId,
    amm,
    positionId,
    client,
    positionState,
  );

  const { token0, token1 } = PositionDetails.fromPositionStateStruct(
    chainId,
    positionState,
  );

  console.log(
    'collectableTokenAmount',
    collectableTokenAmount.token0Amount.toFixed(),
    collectableTokenAmount.token1Amount.toFixed(),
  );
  const { calldata, value } = NonfungiblePositionManager.collectCallParameters({
    tokenId: positionId.toString(),
    recipient,
    ...convertCollectableTokenAmountToExpectedCurrencyOwed(
      collectableTokenAmount,
      chainId,
      token0,
      token1,
      receiveNativeEtherIfApplicable,
    ),
  });

  return getTxToNonfungiblePositionManager(
    getAMMInfo(chainId, amm)!,
    calldata,
    value,
    recipient,
  );
}
