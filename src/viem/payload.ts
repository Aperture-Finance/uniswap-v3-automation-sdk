import {
  ActionTypeEnum,
  ApertureSupportedChainId,
  AutomatedMarketMakerEnum,
  ConditionTypeEnum,
  CreateTriggerPayload,
  PriceCondition,
  getRawRelativePriceFromTokenValueProportion,
} from '@/index';
import { Price, Token } from '@uniswap/sdk-core';
import Big, { BigSource } from 'big.js';

export function generateLimitOrderCloseRequestPayload(
  ownerAddr: string,
  chainId: ApertureSupportedChainId,
  automatedMarketMaker: AutomatedMarketMakerEnum,
  positionId: string,
  outerLimitPrice: Price<Token, Token>,
  maxGasProportion: number,
  expiration: number,
): CreateTriggerPayload {
  // Note that we should use `Token.sortsBefore()` to compare two tokens instead of directly comparing their addresses
  // because an address can be checksum-ed.
  return {
    ownerAddr,
    chainId,
    automatedMarketMaker,
    expiration,
    nftId: positionId,
    condition: {
      type: ConditionTypeEnum.enum.TokenAmount,
      zeroAmountToken: outerLimitPrice.baseCurrency.sortsBefore(
        outerLimitPrice.quoteCurrency,
      )
        ? 0
        : 1,
    },
    action: {
      type: ActionTypeEnum.enum.LimitOrderClose,
      inputTokenAddr: outerLimitPrice.baseCurrency.address,
      maxGasProportion,
    },
  };
}

export function generateAutoCompoundRequestPayload(
  ownerAddr: string,
  chainId: ApertureSupportedChainId,
  automatedMarketMaker: AutomatedMarketMakerEnum,
  positionId: string,
  feeToPrincipalRatioThreshold: number,
  slippage: number,
  maxGasProportion: number,
  expiration: number,
): CreateTriggerPayload {
  return {
    ownerAddr,
    chainId,
    automatedMarketMaker,
    expiration,
    nftId: positionId,
    condition: {
      type: ConditionTypeEnum.enum.AccruedFees,
      feeToPrincipalRatioThreshold,
    },
    action: {
      type: ActionTypeEnum.enum.Reinvest,
      slippage,
      maxGasProportion,
    },
  };
}

/**
 * Generate a price condition from a token value proportion.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param isAbove Whether the proportion is above or below the target.
 * @param token0ValueProportion The proportion of the position value that is held in token0, as a `Big` number between 0
 * and 1, inclusive.
 * @param durationSec The duration of the condition, in seconds.
 * @returns The generated price condition.
 */
export function generatePriceConditionFromTokenValueProportion(
  tickLower: number,
  tickUpper: number,
  isAbove: boolean,
  token0ValueProportion: BigSource,
  durationSec?: number,
): PriceCondition {
  const priceThreshold = getRawRelativePriceFromTokenValueProportion(
    tickLower,
    tickUpper,
    new Big(token0ValueProportion),
  );
  let lte: string | undefined, gte: string | undefined;
  if (isAbove) {
    lte = priceThreshold.toString();
  } else {
    gte = priceThreshold.toString();
  }
  return {
    type: ConditionTypeEnum.enum.Price,
    lte,
    gte,
    durationSec,
  };
}
