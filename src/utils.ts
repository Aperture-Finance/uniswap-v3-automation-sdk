import {
  FeeAmount,
  computePoolAddress as _computePoolAddress,
} from '@aperture_finance/uniswap-v3-sdk';
import { Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { ethers } from 'ethers';
import stringify from 'json-stable-stringify';
import moment, { Moment } from 'moment';
import { Address } from 'viem';

import { getAMMInfo } from './chain';
import {
  ApertureSupportedChainId,
  CreateTriggerPayload,
  DeleteTriggerPayload,
  UpdateTriggerPayload,
} from './interfaces';

const PCS_V3_POOL_INIT_CODE_HASH =
  '0x6ce8eb472fa82df5469c6ab6d485f17c3ad13c8cd7af59b3d4a8026c5ce0f7e2';

/**
 * Generate the payload message of a trigger to be signed.
 * @param payload The trigger payload.
 * @returns The payload message.
 */
export function generatePayloadMessage(
  payload: CreateTriggerPayload | DeleteTriggerPayload | UpdateTriggerPayload,
): string {
  return stringify(payload);
}

/**
 * Sign a payload message with an ethers signer.
 * @param payloadMessage The payload message to sign.
 * @param signer The ethers signer.
 * @returns The signature.
 */
export function signPayloadMessage(
  payloadMessage: string,
  signer: ethers.Signer,
): Promise<string> {
  return signer.signMessage(payloadMessage);
}

/**
 * Sign a trigger payload with an ethers signer.
 * @param payload The trigger payload.
 * @param signer The ethers signer.
 * @returns The signature.
 */
export function signPayload(
  payload: CreateTriggerPayload | DeleteTriggerPayload | UpdateTriggerPayload,
  signer: ethers.Signer,
): Promise<string> {
  return signPayloadMessage(generatePayloadMessage(payload), signer);
}

/**
 * Computes a pool address.
 * If PANCAKESWAP_V3, then use ammInfo.poolDeployer, else use ammInfo.factory.
 * @param amm: The Automated Market Maker
 * @param ammInfo The AutomatedMarketMaker-specific info
 * @param token0 The first token of the pair, irrespective of sort order
 * @param token1 The second token of the pair, irrespective of sort order
 * @param fee The fee tier of the pool
 * @returns The pool address
 */
export function computePoolAddress(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0: Token | string,
  token1: Token | string,
  fee: FeeAmount,
): Address {
  const ammInfo = getAMMInfo(chainId, amm)!;
  return _computePoolAddress({
    factoryAddress:
      amm == AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3
        ? ammInfo.poolDeployer!
        : ammInfo.factory,
    tokenA: new Token(
      // `chainId` is not used in the actual pool address calculation.
      chainId,
      typeof token0 === 'string' ? token0 : token0.address,
      // `decimals` is not used in the actual pool address calculation.
      18,
    ),
    tokenB: new Token(
      // `chainId` is not used in the actual pool address calculation.
      chainId,
      typeof token1 === 'string' ? token1 : token1.address,
      // `decimals` is not used in the actual pool address calculation.
      18,
    ),
    fee,
    initCodeHashManualOverride:
      amm == AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3
        ? PCS_V3_POOL_INIT_CODE_HASH
        : undefined,
  }) as Address;
}

/**
 * @param now: The current moment. This gives option for consistency across day boundaries.
 * @returns the number of days after the campaign phase 2 start date as a BigInt
 * The types for bit shifts have to match, so return as BigInt to avoid accidentally using non-bigints.
 */
export function getDaysFromCampaignPhase2Start(now: Moment = moment()) {
  return BigInt(
    Math.floor(
      moment
        .duration(now.diff(moment('12/04/2024', 'DD/MM/YYYY').utc(true)))
        .asDays(),
    ),
  );
}

/**
 * Checks whether today's daily raffle is consumed from the binary representation of dailyRaffleConsumed.
 * @param dailyRaffleConsumed: The number representation of daily raffle consumed.
 * @param now: The current moment. This gives option for consistency if people are raffling on day boundaries.
 * @returns boolean whether today's daily raffle is consumed.
 * The right most bit is April 12th, 2nd from rightmost bit is April 13th, and so on.
 * For example, if dailyRaffleConsumed == 0, then no daily raffles are consumed, and should return false.
 * If dailyRaffleConsumed == 5, then 5 in binary is 101, meaning the April 12th and April 14th's daily raffles are consumed, but April 13th's daily raffle is not consumed.
 *  DynamoDB numbers are limited to 38 digits of precision, and log2(38 digits) is ~128.
 *    So cutting off daily raffles and always returns true (raffle is consumed) after 120 days.
 */
export function isDailyRaffleConsumed(
  dailyRafflesConsumed: bigint,
  now: Moment = moment(),
): boolean {
  const daysDiff = getDaysFromCampaignPhase2Start(now);
  if (daysDiff > 120) return true;
  return (dailyRafflesConsumed & (1n << daysDiff)) == 1n << daysDiff;
}

/**
 * Get the streak for user.
 * @param datesActive The number representation of dates active.
 * @param now: The current moment. This gives option to ensure consistency on day boundaries.
 * @returns The current streak.
 * The right most bit is April 12th, 2nd from rightmost bit is April 13th, and so on.
 *  DynamoDB numbers are limited to 38 digits of precision, and log2(38 digits) is ~128.
 *    So cutting off streaks and always returns 1 after 120 days.
 */
export function getSteak(datesActive: bigint, now: Moment = moment()): number {
  let daysDiff = getDaysFromCampaignPhase2Start(now);
  let streak = 1;
  if (daysDiff > 120) return streak;
  while (daysDiff > 0) {
    // Bitwise & to check if user was active on specific date.
    // If so, continue to increment streak and check the next day.
    // Since today is not over yet, start checking the streak from yesterday using the prefix decrement.
    if (datesActive & (1n << --daysDiff)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
