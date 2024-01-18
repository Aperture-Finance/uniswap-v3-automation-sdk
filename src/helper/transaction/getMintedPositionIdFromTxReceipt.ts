import {
  ApertureSupportedChainId,
  INonfungiblePositionManager__factory,
  getChainInfo,
} from '@/index';
import { EventFragment } from '@ethersproject/abi';
import { Log, TransactionReceipt } from '@ethersproject/providers';
import { BigNumber } from 'ethers';

/**
 * Parses the specified transaction receipt and extracts the position id (token id) minted by NPM within the transaction.
 * @param chainId Chain id.
 * @param txReceipt The transaction receipt to parse.
 * @param recipientAddress The receipt address to which the position is minted.
 * @returns If a position is minted to `recipientAddress`, the position id is returned. If there is more than one, the first is returned. If there are none, `undefined` is returned.
 */
export function getMintedPositionIdFromTxReceipt(
  chainId: ApertureSupportedChainId,
  txReceipt: TransactionReceipt,
  recipientAddress: string,
): BigNumber | undefined {
  const npmAddress =
    getChainInfo(chainId).uniswap_v3_nonfungible_position_manager.toLowerCase();
  const npmInterface = INonfungiblePositionManager__factory.createInterface();
  const transferLogs = filterLogsByEvent(
    txReceipt,
    npmInterface.getEvent('Transfer'),
  );
  recipientAddress = recipientAddress.toLowerCase();
  for (const log of transferLogs) {
    if (log.address.toLowerCase() === npmAddress) {
      try {
        const event = npmInterface.parseLog(log);
        if (event.args.to.toLowerCase() === recipientAddress) {
          return event.args.tokenId;
        }
      } catch (e) {}
    }
  }
  return undefined;
}

/**
 * Filter logs by event.
 * @param receipt Transaction receipt.
 * @param event Event fragment.
 * @returns The filtered logs.
 */
export function filterLogsByEvent(
  receipt: TransactionReceipt,
  event: EventFragment,
): Log[] {
  const eventSig =
    INonfungiblePositionManager__factory.createInterface().getEventTopic(event);
  return receipt.logs.filter((log) => log.topics[0] === eventSig);
}
