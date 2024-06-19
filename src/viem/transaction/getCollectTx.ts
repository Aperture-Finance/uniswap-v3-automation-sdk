import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import { NonfungiblePositionManager } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { PublicClient, TransactionRequest } from 'viem';

import {
  BasicPositionInfo,
  getBasicPositionInfo,
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
  basicPositionInfo?: BasicPositionInfo,
): Promise<TransactionRequest> {
  if (basicPositionInfo === undefined) {
    basicPositionInfo = await getBasicPositionInfo(
      chainId,
      amm,
      positionId,
      client,
    );
  }
  const collectableTokenAmount = await viewCollectableTokenAmounts(
    chainId,
    amm,
    positionId,
    client,
    basicPositionInfo,
  );
  const { calldata, value } = NonfungiblePositionManager.collectCallParameters({
    tokenId: positionId.toString(),
    recipient,
    ...convertCollectableTokenAmountToExpectedCurrencyOwed(
      collectableTokenAmount,
      chainId,
      basicPositionInfo.token0,
      basicPositionInfo.token1,
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
