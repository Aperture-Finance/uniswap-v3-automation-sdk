import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { z } from 'zod';

export enum ApertureSupportedChainId {
  // Mainnets that use ETH native currency.
  ETHEREUM_MAINNET_CHAIN_ID = 1,
  ARBITRUM_MAINNET_CHAIN_ID = 42161,
  OPTIMISM_MAINNET_CHAIN_ID = 10,
  BASE_MAINNET_CHAIN_ID = 8453,
  MANTA_PACIFIC_MAINNET_CHAIN_ID = 169,
  SCROLL_MAINNET_CHAIN_ID = 534352,

  // Mainnets that use non-ETH native currency.
  POLYGON_MAINNET_CHAIN_ID = 137,
  AVALANCHE_MAINNET_CHAIN_ID = 43114,
  BNB_MAINNET_CHAIN_ID = 56,

  // Testnets.
  MANTA_PACIFIC_TESTNET_CHAIN_ID = 3441005,
}

export const ClientTypeEnum = z.enum(['FRONTEND', 'API']);
export type ClientTypeEnum = z.infer<typeof ClientTypeEnum>;

const ClientTypeSchema = z.object({
  clientType: ClientTypeEnum.optional().describe('The type of the client.'),
});

export const WalletTypeEnum = z.enum([
  'METAMASK',
  'WALLETCONNECT',
  'OKX',
  'COINBASE',
  'RABBY',
  'HALO',
]);
export const WalletConnectSubtypeEnum = z.enum([
  'HALO',
  'SAFE',
  'METAMASK',
  'UNKNOWN',
]);

const ApertureSupportedChainIdEnum = z
  .nativeEnum(ApertureSupportedChainId)
  .describe(
    'The chain id of the network; must be one of the chains supported by Aperture.',
  );

export const ConditionTypeEnum = z.enum([
  'Time',
  'TokenAmount',
  'Price',
  'AccruedFees',
  'RecurringPercentage',
  'RecurringPrice',
  'RecurringRatio',
]);
export type ConditionTypeEnum = z.infer<typeof ConditionTypeEnum>;

export const ActionTypeEnum = z
  .enum([
    'Close',
    'LimitOrderClose',
    'Reinvest',
    'Rebalance',
    'RecurringPercentage',
    'RecurringPrice',
    'RecurringRatio',
  ])
  .describe('The type of action to take.');
export type ActionTypeEnum = z.infer<typeof ActionTypeEnum>;

// TODO: Create a constant for the maximum allowed `maxGasProportion` that matches Automan setting and use it here.
const MaxGasProportionSchema = z
  .number()
  .positive()
  .lte(0.5)
  .describe(
    'Aperture deducts tokens from the position to cover the cost of performing this action (gas). ' +
      'The `maxGasProportion` value represents the largest allowed proportion of the position value to be deducted. ' +
      'For example, a `maxGasProportion` of 0.10 represents 10% of the position, i.e. no more than 10% of the ' +
      "position's tokens (principal and accrued fees) may be deducted. If network gas price is high and the deduction " +
      'would exceed the specified ceiling, then the action will not be triggered.',
  );

const SlippageSchema = z
  .number()
  .nonnegative()
  .lte(1)
  .describe(
    'A number between 0 and 1, inclusive, which Aperture will use as the slippage setting when triggering ' +
      'the action after condition is met. Digits after the sixth decimal point are ignored, i.e. the precision is 0.000001.',
  );

export const TriggerStatusEnum = z
  .enum(['CREATED', 'STARTED', 'COMPLETED', 'INVALID', 'DELETED'])
  .describe('The status of the trigger.');
export type TriggerStatusEnum = z.infer<typeof TriggerStatusEnum>;

export const HexSchema = z
  .string()
  .startsWith('0x')
  .describe('A hexadecimal string.');

export const AddressSchema = HexSchema.length(42).describe(
  'A hexadecimal address.',
);

export const TxHashSchema = HexSchema.length(66).describe(
  'A transaction hash.',
);

export const SignatureSchema = HexSchema.min(132).describe(
  'A raw signature of the ERC-712 typed message described in ERC-4494; the signature can be generated,' +
    ' for example, by https://docs.ethers.org/v5/api/signer/#Signer-signTypedData.',
);

export const TokenAmountSchema = z.object({
  address: AddressSchema.describe('The ERC-20 token contract address.'),
  rawAmount: z
    .string()
    .min(1)
    .describe(
      'The raw amount, which is the human-readable format multiplied by the token decimal.',
    ),
});
export type TokenAmount = z.infer<typeof TokenAmountSchema>;

export const TimeConditionSchema = z
  .object({
    type: z.literal(ConditionTypeEnum.enum.Time),
    timeAfterEpochSec: z
      .number()
      .int()
      .positive()
      .describe(
        'This timestamp threshold is specified as the number of seconds since UNIX epoch.',
      ),
  })
  .describe(
    'The "Time" condition is considered met if the current time meets or exceeds the threshold specified by `timeAfterEpochSec`.',
  );
export type TimeCondition = z.infer<typeof TimeConditionSchema>;

export const TokenAmountConditionSchema = z
  .object({
    type: z.literal(ConditionTypeEnum.enum.TokenAmount),
    zeroAmountToken: z
      .union([z.literal(0), z.literal(1)])
      .describe('Either 0 or 1, representing token0 or token1, respectively.'),
  })
  .describe(
    'The "TokenAmount" condition is considered met if the specified token has a zero (principal) amount in ' +
      'the position. `zeroAmountToken` can only be either 0 or 1, representing token0 or token1 in the position, ' +
      'respectively. For example, if `zeroAmountToken` is 1, then the condition is considered met if token1 in the ' +
      'position is exactly zero. Note that only the principal amount is considered; accrued fees are not.',
  );
export type TokenAmountCondition = z.infer<typeof TokenAmountConditionSchema>;

const DurationSecSchema = z
  .number()
  .int()
  .positive()
  .optional()
  .describe(
    'If set, the condition is only considered met if the price remains satisfaction the threshold requirement' +
      ' for at least the past `durationSec` seconds. For example, if `gte` is 10 and `durationSec` is set to 3600, ' +
      'then the condition is only considered met if the price remains >= 10 for the entire past hour. The historical ' +
      'price feed used is Coingecko.',
  );

export const PriceConditionSchema = z
  .object({
    type: z.literal(ConditionTypeEnum.enum.Price),
    frontendType: z
      .enum(['POSITION_VALUE_RATIO', 'RELATIVE_PRICE'])
      .optional()
      .describe(
        'The type of the price condition to display on the frontend. This allows the frontend to ' +
          'distinguish between ratio-based and relative-price-based contidions.',
      ),
    gte: z
      .string()
      .optional()
      .describe(
        'If `gte` is set, the condition is considered met if the current price >= `gte`.',
      ),
    lte: z
      .string()
      .optional()
      .describe(
        'If `lte` is set, the condition is considered met if the current price <= `lte`.',
      ),
    durationSec: DurationSecSchema,
    // Deprecated. New triggers with `singleToken` set will be rejected after backend is updated. Existing triggers will continue to work.
    singleToken: z
      .union([z.literal(0), z.literal(1)])
      .optional()
      .describe(
        'Deprecated. If `singleToken` is set, the condition is considered met if the current USD price of the specified' +
          " token (either token0 or token1) meets the specified threshold; otherwise, token0's price denominated in " +
          'token1 is compared against the specified threshold,',
      ),
  })
  .describe(
    "The 'Price' condition checks either one token's price or the two tokens' relative price. If `singleToken`" +
      " is set, the price condition compares the specified token's USD price against the specified threshold." +
      "Otherwise, token0's price denominated in token1 is compared against the specified threshold, " +
      'and we follow how a Uniswap V3 liquidity pool defines price, i.e. how much raw token1 equals 1 raw token0 in value. ' +
      '"Raw" means the raw uint256 integer amount used in the token contract. For example, if token A uses 8 decimals, ' +
      'then 1 raw token A represents 10^(-8) tokens in human-readable form.',
  );
export type PriceCondition = z.infer<typeof PriceConditionSchema>;

export const AccruedFeesConditionSchema = z
  .object({
    type: z.literal(ConditionTypeEnum.enum.AccruedFees),
    feeToPrincipalRatioThreshold: z
      .number()
      .positive()
      .describe(
        'The threshold ratio between the accrued fee value and the principal value in the position.',
      ),
  })
  .describe(
    'The accrued-fees condition specifies a threshold in the form of the ratio between the value of accrued ' +
      'fees and that of principal tokens in a specific liquidity position. This condition serves "auto-compound" which ' +
      'triggers a "reinvest" action whenever the accrued fees meet the threshold specified in this condition.',
  );
export type AccruedFeesCondition = z.infer<typeof AccruedFeesConditionSchema>;

export const RecurringConditionTypeEnum = z.enum([
  'RecurringPercentage',
  'RecurringPrice',
  'RecurringRatio',
]);
export type RecurringConditionTypeEnum = z.infer<
  typeof RecurringConditionTypeEnum
>;

export const BaseRecurringConditionSchema = z.object({
  sqrtPriceX96: z
    .string()
    .min(1)
    .describe(
      'Square root price of `token0` multiplied by 2^96 at trigger creation',
    ),
  durationSec: DurationSecSchema,
});

export const RecurringPercentageConditionSchema =
  BaseRecurringConditionSchema.extend({
    type: z.literal(RecurringConditionTypeEnum.enum.RecurringPercentage),
    gteTickOffset: z
      .number()
      .optional()
      .describe(
        'Next trigger price that gets triggered when the pool price is greater than or equal to it, ' +
          'as a tick offset from the current tick.',
      ),
    lteTickOffset: z
      .number()
      .optional()
      .describe(
        'Next trigger price that gets triggered when the pool price is less than or equal to it, ' +
          'as a tick offset from the current tick.',
      ),
  }).describe(
    'The "RecurringPercentage" condition defines the target prices in terms of a percentage offset from the ' +
      'current price for the next trigger condition.',
  );
export type RecurringPercentageCondition = z.infer<
  typeof RecurringPercentageConditionSchema
>;

export const RecurringPriceConditionSchema =
  BaseRecurringConditionSchema.extend({
    type: z.literal(RecurringConditionTypeEnum.enum.RecurringPrice),
    baseToken: z
      .union([z.literal(0), z.literal(1)])
      .describe('Either 0 or 1, representing token0 or token1, respectively.'),
    gtePriceOffset: z
      .string()
      .min(1)
      .optional()
      .describe(
        'The next trigger price that gets triggered when the pool price is greater than or equal to it, ' +
          'as a price offset from the current price in human-readable format.',
      ),
    ltePriceOffset: z
      .string()
      .min(1)
      .optional()
      .describe(
        'The next trigger price that gets triggered when the pool price is less than or equal to it, ' +
          'as a price offset from the current price in human-readable format.',
      ),
  }).describe(
    'The "RecurringPrice" condition defines the target prices in terms of a price offset from the current ' +
      'price for the next trigger condition.',
  );
export type RecurringPriceCondition = z.infer<
  typeof RecurringPriceConditionSchema
>;

export const RecurringRatioConditionSchema =
  BaseRecurringConditionSchema.extend({
    type: z.literal(RecurringConditionTypeEnum.enum.RecurringRatio),
    gteToken0ValueProportion: z
      .string()
      .min(1)
      .optional()
      .describe(
        'The proportion of the position value in token0 that defines the target price which gets ' +
          'triggered when the pool price is greater than or equal to it.',
      ),
    lteToken0ValueProportion: z
      .string()
      .min(1)
      .optional()
      .describe(
        'The proportion of the position value in token0 that defines the target price which gets ' +
          'triggered when the pool price is less than or equal to it.',
      ),
  }).describe(
    'The "RecurringRatio" condition defines the target ratio in terms of the proportion of the position ' +
      'value in token0 for the next trigger condition.',
  );
export type RecurringRatioCondition = z.infer<
  typeof RecurringRatioConditionSchema
>;

export const RecurringConditionSchema = z
  .discriminatedUnion('type', [
    RecurringPercentageConditionSchema,
    RecurringPriceConditionSchema,
    RecurringRatioConditionSchema,
  ])
  .describe('The definition of the next trigger condition.');
export type RecurringCondition = z.infer<typeof RecurringConditionSchema>;

export const ConditionSchema = z
  .discriminatedUnion('type', [
    TimeConditionSchema,
    TokenAmountConditionSchema,
    PriceConditionSchema,
    AccruedFeesConditionSchema,
    RecurringPercentageConditionSchema,
    RecurringPriceConditionSchema,
    RecurringRatioConditionSchema,
  ])
  .describe(
    'The condition which triggers the action. If a trigger is successfully created with a condition that is' +
      ' already met at the time of trigger creation, then the action is immediately eligible to be triggered.',
  );
export type Condition = z.infer<typeof ConditionSchema>;

const BaseActionSchema = z.object({
  slippage: SlippageSchema,
  maxGasProportion: MaxGasProportionSchema,
});

export const CloseActionSchema = BaseActionSchema.extend({
  type: z.literal(ActionTypeEnum.enum.Close),
}).describe(
  'The "Close" action close the position, and send both tokens (principal and collected fees) to the position owner.',
);
export type CloseAction = z.infer<typeof CloseActionSchema>;

export const LimitOrderCloseActionSchema = z
  .object({
    type: z.literal(ActionTypeEnum.enum.LimitOrderClose),
    inputTokenAddr: AddressSchema.describe(
      'The address of the input token for the limit order, i.e. the token which the user provided and ' +
        'wants to sell. Must be one of the two tokens in the position.',
    ),
    maxGasProportion: MaxGasProportionSchema,
  })
  .describe(
    "The 'LimitOrderClose' action behaves the same as 'Close' but the position serves a limit order placed through Aperture. " +
      'No slippage needs to be specified as limit order positions are always closed with a zero slippage setting.',
  );
export type LimitOrderCloseAction = z.infer<typeof LimitOrderCloseActionSchema>;

export const ReinvestActionSchema = BaseActionSchema.extend({
  type: z.literal(ActionTypeEnum.enum.Reinvest),
}).describe(
  'The "Reinvest" action claims accrued fees, swap them to the same ratio as the principal amounts, and add liquidity.',
);
export type ReinvestAction = z.infer<typeof ReinvestActionSchema>;

export const RebalanceActionSchema = BaseActionSchema.extend({
  type: z.literal(ActionTypeEnum.enum.Rebalance),
  tickLower: z
    .number()
    .int()
    .describe('The lower tick of the new price range.'),
  tickUpper: z
    .number()
    .int()
    .describe('The upper tick of the new price range.'),
  isCurrentTickOffset: z
    .boolean()
    .optional()
    .describe(
      'When true, `tickLower` and `tickUpper` are offsets from the current tick.',
    ),
}).describe(
  'The "Rebalance" action closes the position, and swap tokens (principal and collected fees) to the ' +
    'ratio required by the specified new price range, and open a position with that price range.',
);
export type RebalanceAction = z.infer<typeof RebalanceActionSchema>;

const BaseRecurringActionSchema = BaseActionSchema.extend({
  strategyId: z
    .string()
    .optional()
    .describe(
      'The id of the recurring rebalance strategy to identify the series of positions.',
    ),
});

export const RecurringPercentageActionSchema = BaseRecurringActionSchema.extend(
  {
    type: z.literal(ActionTypeEnum.enum.RecurringPercentage),
    tickLowerOffset: z
      .number()
      .int()
      .describe('The lower tick offset of the new price range.'),
    tickUpperOffset: z
      .number()
      .int()
      .describe('The upper tick offset of the new price range.'),
  },
).describe(
  'Rebalance to a new price range specified by the future pool tick and the tick offsets.',
);
export type RecurringPercentageAction = z.infer<
  typeof RecurringPercentageActionSchema
>;

export const RecurringPriceActionSchema = BaseRecurringActionSchema.extend({
  type: z.literal(ActionTypeEnum.enum.RecurringPrice),
  baseToken: z
    .union([z.literal(0), z.literal(1)])
    .describe('Either 0 or 1, representing token0 or token1, respectively.'),
  priceLowerOffset: z
    .string()
    .min(1)
    .describe('The lower price offset in human-readable format.'),
  priceUpperOffset: z
    .string()
    .min(1)
    .describe('The upper price offset in human-readable format.'),
}).describe(
  'Rebalance to a new price range specified by the future pool price of the base token and the price offsets.',
);
export type RecurringPriceAction = z.infer<typeof RecurringPriceActionSchema>;

export const RecurringRatioActionSchema = BaseRecurringActionSchema.extend({
  type: z.literal(ActionTypeEnum.enum.RecurringRatio),
  tickRangeWidth: z.number().int().describe('The width of the tick range.'),
  token0ValueProportion: z
    .string()
    .min(1)
    .describe('The proportion of the position value in token0.'),
}).describe(
  'Rebalance to a new price range specified by the tick range width and the proportion of the position value in token0.',
);
export type RecurringRatioAction = z.infer<typeof RecurringRatioActionSchema>;

export const RecurringActionSchema = z.discriminatedUnion('type', [
  RecurringPercentageActionSchema,
  RecurringPriceActionSchema,
  RecurringRatioActionSchema,
]);
export type RecurringAction = z.infer<typeof RecurringActionSchema>;

export const ActionSchema = z.discriminatedUnion('type', [
  CloseActionSchema,
  LimitOrderCloseActionSchema,
  ReinvestActionSchema,
  RebalanceActionSchema,
  RecurringPercentageActionSchema,
  RecurringPriceActionSchema,
  RecurringRatioActionSchema,
]);
export type Action = z.infer<typeof ActionSchema>;

const BaseTriggerPayloadSchema = ClientTypeSchema.extend({
  ownerAddr: AddressSchema.describe(
    'The owner address of the position; must be a checksum address.',
  ),
  chainId: ApertureSupportedChainIdEnum,
});
const TriggerIdentifierSchema = BaseTriggerPayloadSchema.extend({
  taskId: z
    .number()
    .nonnegative()
    .describe("The task id of the trigger in Aperture's automation service."),
});

export const CreateTriggerPayloadSchema = BaseTriggerPayloadSchema.extend({
  amm: AutomatedMarketMakerEnum.default(
    AutomatedMarketMakerEnum.enum.UNISWAP_V3,
  ).describe(
    'The automated market maker. If not specified, then this will be UNISWAP_V3.',
  ),
  nftId: z
    .string()
    .min(1)
    .describe('The nonfungible token id of the position.'),
  action: ActionSchema,
  condition: ConditionSchema,
  expiration: z
    .number()
    .int()
    .positive()
    .describe('Unix timestamp in seconds when this trigger expires.'),
  autoCompound: z
    .object({
      action: ReinvestActionSchema,
      condition: AccruedFeesConditionSchema,
    })
    .optional()
    .describe('If populated, a reinvest trigger will be created as well.'),
});
export type CreateTriggerPayload = z.infer<typeof CreateTriggerPayloadSchema>;

export const DeleteTriggerPayloadSchema = TriggerIdentifierSchema;
export type DeleteTriggerPayload = z.infer<typeof DeleteTriggerPayloadSchema>;

export const UpdateTriggerPayloadSchema = TriggerIdentifierSchema.extend({
  action: ActionSchema.optional().describe(
    'If populated, update the action to details specified here; otherwise, action details remain unchanged.',
  ),
  condition: ConditionSchema.optional().describe(
    'If populated, update the condition to details specified here; otherwise, condition details remain unchanged.',
  ),
  expiration: z
    .number()
    .int()
    .positive()
    .describe('Unix timestamp in seconds when this trigger expires.'),
});
export type UpdateTriggerPayload = z.infer<typeof UpdateTriggerPayloadSchema>;

export const PermitInfoSchema = z
  .object({
    signature: SignatureSchema,
    deadline: z
      .string()
      .min(1)
      .describe(
        'Unix timestamp in seconds indicating deadline for the signed "permit".',
      ),
  })
  .describe(
    'Information about a "permit" message signed by the position owner authorizing Aperture UniV3 Automan ' +
      'contract to trigger actions on the position. See https://eips.ethereum.org/EIPS/eip-4494 for information on ' +
      'the "permit" approval flow.',
  );
export type PermitInfo = z.infer<typeof PermitInfoSchema>;

export const CheckPositionPermitRequestSchema = ClientTypeSchema.extend({
  chainId: ApertureSupportedChainIdEnum,
  amm: AutomatedMarketMakerEnum,
  tokenId: z
    .string()
    .min(1)
    .describe('The nonfungible token id of the position.'),
});
export type CheckPositionPermitRequest = z.infer<
  typeof CheckPositionPermitRequestSchema
>;

export const UpdatePositionPermitRequestSchema =
  CheckPositionPermitRequestSchema.extend({
    permitInfo: PermitInfoSchema,
  });
export type UpdatePositionPermitRequest = z.infer<
  typeof UpdatePositionPermitRequestSchema
>;

export const PayloadSignatureSchema = z.object({
  payloadSignature: SignatureSchema.describe('Signature of the payload.'),
});

export const CreateTriggerRequestSchema = PayloadSignatureSchema.extend({
  payload: CreateTriggerPayloadSchema,
  permitInfo: PermitInfoSchema.optional().describe(
    "If Aperture doesn't already have authority over the position, " +
      'then `permitInfo` should be obtained from the user and populated here.',
  ),
});
export type CreateTriggerRequest = z.infer<typeof CreateTriggerRequestSchema>;

export const DeleteTriggerRequestSchema = PayloadSignatureSchema.extend({
  payload: DeleteTriggerPayloadSchema,
});
export type DeleteTriggerRequest = z.infer<typeof DeleteTriggerRequestSchema>;

export const UpdateTriggerRequestSchema = PayloadSignatureSchema.extend({
  payload: UpdateTriggerPayloadSchema,
});
export type UpdateTriggerRequest = z.infer<typeof UpdateTriggerRequestSchema>;

export const ListTriggerRequestSchema = BaseTriggerPayloadSchema.extend({
  amm: AutomatedMarketMakerEnum,
  isLimitOrder: z
    .boolean()
    .describe(
      'If true, only list triggers for limit order fulfillment; otherwise, list all triggers except for limit order fulfillment.',
    ),
});
export type ListTriggerRequest = z.infer<typeof ListTriggerRequestSchema>;

export const LimitOrderInfoSchema = z.object({
  inputTokenAmountAtCreation: TokenAmountSchema.describe(
    'The amount of input token at limit order creation.',
  ),
  outputTokenAmountAtClosure: TokenAmountSchema.describe(
    'The calculated amount of output token at limit order closure. Note that the limit order may still be pending fulfillment.',
  ),
  earnedFeeInputToken: z
    .string()
    .optional()
    .describe(
      'The amount of fees earned in input token. Only populated after the limit order is fulfilled.',
    ),
  earnedFeeOutputToken: z
    .string()
    .optional()
    .describe(
      'The amount of fees earned in output token. Only populated after the limit order is fulfilled.',
    ),
  feeTier: z
    .nativeEnum(FeeAmount)
    .describe('The fee tier of the pool used by the limit order.'),
  tickLower: z
    .number()
    .int()
    .describe('The lower tick of the position serving the limit order.'),
  tickUpper: z
    .number()
    .int()
    .describe('The upper tick of the position serving the limit order.'),
});
export type LimitOrderInfo = z.infer<typeof LimitOrderInfoSchema>;

export const TriggerItemSchema = z.object({
  taskId: z
    .number()
    .nonnegative()
    .describe("The task id of the trigger in Aperture's automation service."),
  nftId: z
    .string()
    .min(1)
    .describe('The nonfungible token id of the position.'),
  status: TriggerStatusEnum,
  lastFailedMessage: z
    .string()
    .optional()
    .describe('If populated, the failure message of the last failed trigger.'),
  limitOrderInfo: LimitOrderInfoSchema.optional(),
  condition: ConditionSchema,
  action: ActionSchema,
  expiration: z
    .number()
    .int()
    .positive()
    .describe('Unix timestamp in seconds when this trigger expires.'),
  creation: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Unix timestamp in seconds when this trigger is created.'),
  completion: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Unix timestamp in seconds when this trigger is completed.'),
  transactionHash: HexSchema.optional().describe(
    'The transaction hash of the transaction that triggered this action.',
  ),
});
export type TriggerItem = z.infer<typeof TriggerItemSchema>;

export const ListTriggerResponseSchema = z.object({
  triggers: z.array(TriggerItemSchema).describe('The list of triggers.'),
});
export type ListTriggerResponse = z.infer<typeof ListTriggerResponseSchema>;

export const CheckUserLimitRequestSchema = ClientTypeSchema.extend({
  ownerAddr: AddressSchema.describe(
    'The owner address of position `tokenId`; must be a checksum address.',
  ),
  chainId: ApertureSupportedChainIdEnum,
  amm: AutomatedMarketMakerEnum,
  tokenId: z
    .string()
    .min(1)
    .describe('The nonfungible token id of the position to check limit for.'),
  actionType: ActionTypeEnum,
});
export type CheckUserLimitRequest = z.infer<typeof CheckUserLimitRequestSchema>;

export const SignPrivateBetaAgreementRequestSchema = ClientTypeSchema.extend({
  ownerAddr: AddressSchema.describe(
    'The user wallet address; must be a checksum address.',
  ),
  signature: SignatureSchema.describe('User signature.'),
});
export type SignPrivateBetaAgreementRequest = z.infer<
  typeof SignPrivateBetaAgreementRequestSchema
>;

export const HasSignedPrivateBetaAgreementRequestSchema =
  ClientTypeSchema.extend({
    ownerAddr: AddressSchema.describe(
      'The user wallet address; must be a checksum address.',
    ),
  });
export type HasSignedPrivateBetaAgreementRequest = z.infer<
  typeof HasSignedPrivateBetaAgreementRequestSchema
>;

export const HasSignedPrivateBetaAgreementResponseSchema = z.object({
  hasSigned: z
    .boolean()
    .describe(
      'True if the user has signed the private beta agreement; false otherwise.',
    ),
});
export type HasSignedPrivateBetaAgreementResponse = z.infer<
  typeof HasSignedPrivateBetaAgreementResponseSchema
>;

const GetStrategyRequestBaseSchema = ClientTypeSchema.extend({
  ownerAddr: AddressSchema.describe(
    'The owner address of the request strategy/strategies; must be a checksum address.',
  ),
  chainId: ApertureSupportedChainIdEnum,
});

export const GetStrategiesDetailRequestSchema =
  GetStrategyRequestBaseSchema.extend({
    amm: AutomatedMarketMakerEnum,
  });
export type GetStrategiesDetailRequest = z.infer<
  typeof GetStrategiesDetailRequestSchema
>;

export const GetStrategyDetailRequestSchema =
  GetStrategyRequestBaseSchema.extend({
    strategyId: z.string().min(1).describe('The id of the strategy.'),
  });
export type GetStrategyDetailRequest = z.infer<
  typeof GetStrategyDetailRequestSchema
>;

export const StrategyDetailItemSchema = TriggerItemSchema.omit({
  limitOrderInfo: true,
}).extend({
  gas_fee: z.number().nonnegative().optional(),
  gas_fee_value: z.number().nonnegative().optional(),
  token0Address: z.string().length(42).optional(),
  token1Address: z.string().length(42).optional(),
  feeTier: z.number().nonnegative().optional(),
  tickLower: z.number().int().optional(),
  tickUpper: z.number().int().optional(),
  positionEtherValue: z
    .number()
    .optional()
    .describe(
      "The value of the position's prinpical tokens in the chain's native currency, e.g. a value of 2.3 means " +
        "that the position's prinpical tokens are worth 2.3 ETH if the chain's native currency is ETH. Only populated " +
        'when the action is triggered and the task switches to STARTED status.',
    ),
  positionEtherValueWhenCompleted: z
    .number()
    .optional()
    .describe(
      "The value of the position's prinpical tokens in the chain's native currency, e.g. a value of 2.3 means " +
        "that the position's prinpical tokens are worth 2.3 ETH if the chain's native currency is ETH. Only populated " +
        'when the action is completed and the task switches to COMPLETED status.',
    ),
  positionUsdValueWhenCompleted: z
    .number()
    .optional()
    .describe(
      "The value of the position's prinpical tokens in USD. Only populated when the action is completed and the task switches to COMPLETED status.",
    ),
  accruedFeeFraction: z
    .number()
    .optional()
    .describe(
      'A number representing the ratio between accrued fees in the position and principal value. Only populated ' +
        'when the action is triggered and the task switches to STARTED status, and the condition is of type AccruedFees.',
    ),
  feeCollectedToken0: z
    .number()
    .optional()
    .describe(
      'A number representing the fee collected on token0. Only populated when the action is triggered and the ' +
        'task switches to COMPLETED status, and the type is of Reinvest or Rebalance.',
    ),
  feeCollectedToken1: z
    .number()
    .optional()
    .describe(
      'A number representing the fee collected on token0. Only populated when the action is triggered and the ' +
        'task switches to COMPLETED status, and the type is of Reinvest or Rebalance.',
    ),
  feeCollectedToken0UsdValue: z
    .number()
    .optional()
    .describe(
      'A number representing the fee collected on token0. Only populated when the action is triggered and the ' +
        'task switches to COMPLETED status, and the type is of Reinvest or Rebalance.',
    ),
  feeCollectedToken1UsdValue: z
    .number()
    .optional()
    .describe(
      'A number representing the fee collected on token0. Only populated when the action is triggered and the ' +
        'task switches to COMPLETED status, and the type is of Reinvest or Rebalance.',
    ),
});

export type StrategyDetailItem = z.infer<typeof StrategyDetailItemSchema>;

export const GetStrategyDetailResponseSchema = z.object({
  executed: z
    .number()
    .int()
    .describe('Number of times the strategy is executed.'),
  feeCollected: z.object({
    feeCollectedToken0: z.number(),
    feeCollectedToken1: z.number(),
    feeCollectedToken0UsdValue: z.number(),
    feeCollectedToken1UsdValue: z.number(),
  }),
  current: z
    .array(StrategyDetailItemSchema)
    .describe('Current strategy trigger.'),
  history: z
    .array(StrategyDetailItemSchema)
    .describe('History of strategy triggers.'),
});
export type GetStrategyDetailResponse = z.infer<
  typeof GetStrategyDetailResponseSchema
>;

export const GetStrategiesDetailResponseSchema = z.array(
  GetStrategyDetailResponseSchema,
);
export type GetStrategiesDetailResponse = z.infer<
  typeof GetStrategiesDetailResponseSchema
>;

export const WalletTrackingRequestSchema = z.object({
  chainId: ApertureSupportedChainIdEnum,
  amm: AutomatedMarketMakerEnum,
  address: AddressSchema,
  timestamp_secs: z.number().int().positive(),
  walletClient: WalletTypeEnum,
  walletConnectSubtype: WalletConnectSubtypeEnum.optional(),
});
export type WalletTrackingRequest = z.infer<typeof WalletTrackingRequestSchema>;

export const GeneralResponseSchema = z.object({
  error: z.boolean().optional().describe('True if an error occurred.'),
  errorMessage: z.string().optional().describe('The error message.'),
});

export type GeneralResponse = z.infer<typeof GeneralResponseSchema>;

export const GetHaloUsersRequestSchema = z.object({
  utcDateString: z.coerce.date().describe('The date in UTC.'),
});
export type GetHaloUsersRequest = z.infer<typeof GetHaloUsersRequestSchema>;

export const GetHaloUsersResponseSchema = z.object({
  users: z.array(
    z.object({
      address: AddressSchema,
      utcDateString: z.coerce.date().describe('The date in UTC.'),
      didSwap: z.boolean().describe('True if the user did a swap.'),
      didRebalance: z.boolean().describe('True if the user did a rebalance.'),
      didOpenPosition: z
        .boolean()
        .describe('True if the user opened a position.'),
    }),
  ),
});
export type GetHaloUsersResponse = z.infer<typeof GetHaloUsersResponseSchema>;

export const UserActivityTrackingRequestSchema = z.object({
  userAddress: AddressSchema,
  clientTimestampSecs: z.number().int().positive(),
  chainId: ApertureSupportedChainIdEnum,
  amm: AutomatedMarketMakerEnum,
  // In the user activity DynamoDB table, in addition to the five "instant" action types below, the action type value can also be 'CreateTrigger' or 'ExecuteTrigger'; these two are added to the table by the backend trigger handlers as appropriate.
  actionType: z.enum([
    'Swap',
    'OpenPosition',
    'AddLiquidity',
    'RemoveLiquidity',
    'Rebalance',
    'Reinvest',
  ]),
  txHash: TxHashSchema,
  walletType: WalletTypeEnum,
  walletSubType: WalletConnectSubtypeEnum.optional(),
});
export type UserActivityTrackingRequest = z.infer<
  typeof UserActivityTrackingRequestSchema
>;
