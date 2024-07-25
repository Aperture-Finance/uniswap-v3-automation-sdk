import { Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { getEip1167Create2Address } from 'eip1167';
import { ethers } from 'ethers';
import stringify from 'json-stable-stringify';
import {
  Address,
  Hex,
  encodeAbiParameters,
  getAddress,
  getContractAddress,
  keccak256,
  parseAbiParameters,
} from 'viem';

import { getAMMInfo } from './chain';
import {
  ApertureSupportedChainId,
  CreateTriggerPayload,
  DeleteTriggerPayload,
  UpdateTriggerPayload,
} from './interfaces';

const PCS_V3_POOL_INIT_CODE_HASH: Hex =
  '0x6ce8eb472fa82df5469c6ab6d485f17c3ad13c8cd7af59b3d4a8026c5ce0f7e2';
const UNISWAP_V3_POOL_INIT_CODE_HASH: Hex =
  '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54';

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
 * @param tokenA The first token of the pair, irrespective of sort order
 * @param tokenB The second token of the pair, irrespective of sort order
 * @param fee The fee tier of the pool (only for UNISWAP_V3 and PANCAKESWAP_V3)
 * @param tickSpacing The tick spacing (only for SLIPSTREAM)
 * @returns The pool address
 */
export function computePoolAddress(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  tokenA: Token | string,
  tokenB: Token | string,
  feeOrTickSpacing: number,
): Address {
  const ammInfo = getAMMInfo(chainId, amm);
  if (!ammInfo) {
    throw new Error('Invalid (chainId, AMM)');
  }

  const tokenAAddress = getAddress(
    typeof tokenA === 'string' ? tokenA : tokenA.address,
  );
  const tokenBAddress = getAddress(
    typeof tokenB === 'string' ? tokenB : tokenB.address,
  );
  const [token0Address, token1Address] =
    tokenAAddress.toLowerCase() < tokenBAddress.toLowerCase()
      ? [tokenAAddress, tokenBAddress]
      : [tokenBAddress, tokenAAddress];

  if (amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM) {
    if (!feeOrTickSpacing) {
      throw new Error('tickSpacing is required for SLIPSTREAM');
    }
    return getEip1167Create2Address(
      ammInfo.factory,
      keccak256(
        encodeAbiParameters(
          parseAbiParameters(
            'address token0, address token1, int24 tickSpacing',
          ),
          [token0Address, token1Address, feeOrTickSpacing!],
        ),
      ),
      ammInfo.poolImplementation!,
    ) as Address;
  }

  if (!feeOrTickSpacing) {
    throw new Error('fee is required for UNISWAP_V3 and PANCAKESWAP_V3');
  }
  return getContractAddress({
    opcode: 'CREATE2',
    from:
      amm === AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3
        ? ammInfo.poolDeployer!
        : ammInfo.factory,
    salt: keccak256(
      encodeAbiParameters(
        parseAbiParameters('address token0, address token1, uint24 fee'),
        [token0Address, token1Address, feeOrTickSpacing],
      ),
    ),
    bytecodeHash:
      amm === AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3
        ? PCS_V3_POOL_INIT_CODE_HASH
        : UNISWAP_V3_POOL_INIT_CODE_HASH,
  });
}
