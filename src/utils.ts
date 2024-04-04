import {
  FeeAmount,
  computePoolAddress as _computePoolAddress,
} from '@aperture_finance/uniswap-v3-sdk';
import { Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { ethers } from 'ethers';
import stringify from 'json-stable-stringify';
import { Address } from 'viem';

import { AmmInfo } from './chain';
import {
  CreateTriggerPayload,
  DeleteTriggerPayload,
  UpdateTriggerPayload,
} from './interfaces';

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
  amm: AutomatedMarketMakerEnum,
  ammInfo: AmmInfo,
  token0: Token | string,
  token1: Token | string,
  fee: FeeAmount,
): Address {
  return _computePoolAddress({
    factoryAddress:
      amm == AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3
        ? ammInfo.poolDeployer!
        : ammInfo.factory,
    tokenA: new Token(
      1,
      typeof token0 === 'string' ? token0 : token0.address,
      18,
    ),
    tokenB: new Token(
      1,
      typeof token1 === 'string' ? token1 : token1.address,
      18,
    ),
    fee,
  }) as Address;
}
