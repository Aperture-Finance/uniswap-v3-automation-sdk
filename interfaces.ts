import { FeeAmount } from '@uniswap/v3-sdk';
import { z } from 'zod';

export enum ApertureSupportedChainId {
  ETHEREUM_MAINNET_CHAIN_ID = 1,
  ARBITRUM_MAINNET_CHAIN_ID = 42161,
  GOERLI_TESTNET_CHAIN_ID = 5,
  ARBITRUM_GOERLI_TESTNET_CHAIN_ID = 421613,
}

const ApertureSupportedChainIdEnum = z.nativeEnum(ApertureSupportedChainId);

export const ConditionTypeEnum = z.enum([
  'Time',
  'TokenAmount',
  'Price',
  'AccruedFees',
]);
export type ConditionTypeEnum = z.infer<typeof ConditionTypeEnum>;

export const ActionTypeEnum = z.enum([
  'Close',
  'LimitOrderClose',
  'Reinvest',
  'Rebalance',
]);
export type ActionTypeEnum = z.infer<typeof ActionTypeEnum>;

// TODO: Create a constant for the maximum allowed `maxGasProportion` that matches Automan setting and use it here.
const MaxGasProportionSchema = z.number().positive().lte(0.5);

const SlippageSchema = z.number().nonnegative().lte(1);

export const TriggerStatusEnum = z.enum([
  'CREATED',
  'STARTED',
  'COMPLETED',
  'INVALID',
  'DELETED',
]);
export type TriggerStatusEnum = z.infer<typeof TriggerStatusEnum>;

export const TokenAmountSchema = z.object({
  address: z.string().nonempty().describe('The ERC-20 token contract address.'),
  rawAmount: z
    .string()
    .nonempty()
    .describe(
      'The raw amount, which is the human-readable format multiplied by the token decimal.',
    ),
});
export type TokenAmount = z.infer<typeof TokenAmountSchema>;

export const TimeConditionSchema = z.object({
  type: z.literal(ConditionTypeEnum.enum.Time),
  timeAfterEpochSec: z
    .number()
    .int()
    .positive()
    .describe(
      'This timestamp threshold is specified as the number of seconds since UNIX epoch. ' +
        'The condition is considered met if the current time meets or exceeds `timeAfterEpochSec`.',
    ),
});
export type TimeCondition = z.infer<typeof TimeConditionSchema>;

export const TokenAmountConditionSchema = z.object({
  type: z.literal(ConditionTypeEnum.enum.TokenAmount),
  zeroAmountToken: z
    .union([z.literal(0), z.literal(1)])
    .describe(
      'The condition is considered met if the specified token has a zero (principal) amount in the position. ' +
        '`zeroAmountToken` can only be either 0 or 1, representing token0 or token1 in the position, respectively. ' +
        'For example, if `zeroAmountToken` is 1, then the condition is considered met if token1 in the position is exactly zero. ' +
        'Note that only the principal amount is considered; accrued fees are not.',
    ),
});
export type TokenAmountCondition = z.infer<typeof TokenAmountConditionSchema>;

export const PriceConditionSchema = z
  .object({
    type: z
      .literal(ConditionTypeEnum.enum.Price)
      .describe(
        'Exactly one of `gte` and `lte` should be defined; the other must be `undefined`. ' +
          'The defined float value represents the price threshold to compare against.',
      ),
    gte: z
      .number()
      .positive()
      .optional()
      .describe(
        'If `gte` is set, the condition is considered met if the current price >= `gte`.',
      ),
    lte: z
      .number()
      .positive()
      .optional()
      .describe(
        'If `lte` is set, the condition is considered met if the current price <= `lte`.',
      ),
    durationSec: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'If set, the condition is only considered met if the price remains satisfaction the threshold requirement' +
          ' for at least the past `durationSec` seconds. For example, if `gte` is 10 and `durationSec` is set to 3600, ' +
          'then the condition is only considered met if the price remains >= 10 for the entire past hour. The historical ' +
          'price feed used is Coingecko.',
      ),
  })
  .describe(
    "The price condition compares token0's price denominated in token1 against a specified threshold. " +
      'We follow how a Uniswap V3 liquidity pool defines price, i.e. how much raw token1 equals 1 raw token0 in value. ' +
      '"Raw" means the raw uint256 integer amount used in the token contract. For example, if token A uses 8 decimals, ' +
      'then 1 raw token A represents 10^(-8) tokens in human-readable form.',
  );
export type PriceCondition = z.infer<typeof PriceConditionSchema>;

export const AccruedFeesConditionSchema = z
  .object({
    type: z.literal(ConditionTypeEnum.enum.AccruedFees),
    feeToPrincipalRatioThreshold: z.number().positive(),
  })
  .describe(
    'The accrued-fees condition specifies a threshold in the form of the ratio between the value of accrued ' +
      'fees and that of principal tokens in a specific liquidity position. This condition serves "auto-compound" which ' +
      'triggers a "reinvest" action whenever the accrued fees meet the threshold specified in this condition.',
  );
export type AccruedFeesCondition = z.infer<typeof AccruedFeesConditionSchema>;

export const ConditionSchema = z.discriminatedUnion('type', [
  TimeConditionSchema,
  TokenAmountConditionSchema,
  PriceConditionSchema,
  AccruedFeesConditionSchema,
]);
export type Condition = z.infer<typeof ConditionSchema>;

export const CloseActionSchema = z
  .object({
    type: z.literal(ActionTypeEnum.enum.Close),
    slippage: SlippageSchema.describe(
      'A number between 0 and 1, inclusive. Digits after the sixth decimal point are ignored, i.e. the precision is 0.000001.',
    ),
    maxGasProportion: MaxGasProportionSchema.describe(
      'Aperture deducts tokens from the position to cover the cost of performing this action (gas). ' +
        'The `maxGasProportion` value represents the largest allowed proportion of the position value to be deducted. ' +
        'For example, a `maxGasProportion` of 0.10 represents 10% of the position, i.e. no more than 10% of the ' +
        "position's tokens (principal and accrued fees) may be deducted. If network gas price is high and the deduction " +
        'would exceed the specified ceiling, then the action will not be triggered.',
    ),
  })
  .describe(
    'Close a position, and send both tokens (principal and collected fees) to the position owner.',
  );
export type CloseAction = z.infer<typeof CloseActionSchema>;

export const LimitOrderCloseActionSchema = z
  .object({
    type: z.literal(ActionTypeEnum.enum.LimitOrderClose),
    inputTokenAmount: TokenAmountSchema,
    outputTokenAddr: z.string().nonempty(),
    feeTier: z.nativeEnum(FeeAmount),
    maxGasProportion: MaxGasProportionSchema,
  })
  .describe(
    "Same as 'Close' but the position serves a limit order placed on Aperture. " +
      'No slippage needs to be specified as limit order positions are always closed with a zero slippage setting.',
  );
export type LimitOrderCloseAction = z.infer<typeof LimitOrderCloseActionSchema>;

export const ReinvestActionSchema = z
  .object({
    type: z.literal(ActionTypeEnum.enum.Reinvest),
    slippage: SlippageSchema,
    maxGasProportion: MaxGasProportionSchema,
  })
  .describe(
    'Claims accrued fees, swap them to the same ratio as the principal amounts, and add liquidity.',
  );
export type ReinvestAction = z.infer<typeof ReinvestActionSchema>;

export const RebalanceActionSchema = z
  .object({
    type: z.literal(ActionTypeEnum.enum.Rebalance),
    tickLower: z.number().int(),
    tickUpper: z.number().int(),
    slippage: SlippageSchema,
    maxGasProportion: MaxGasProportionSchema,
  })
  .describe(
    'Close a position, and swap tokens (principal and collected fees) to the ratio required by the ' +
      'specified new price range, and open a position with that price range.',
  );
export type RebalanceAction = z.infer<typeof RebalanceActionSchema>;

export const ActionSchema = z.discriminatedUnion('type', [
  CloseActionSchema,
  LimitOrderCloseActionSchema,
  ReinvestActionSchema,
  RebalanceActionSchema,
]);
export type Action = z.infer<typeof ActionSchema>;

export const CreateTriggerPayloadSchema = z.object({
  ownerAddr: z.string().nonempty(),
  chainId: ApertureSupportedChainIdEnum,
  nftId: z.string().nonempty(),
  condition: ConditionSchema,
  action: ActionSchema,
});
export type CreateTriggerPayload = z.infer<typeof CreateTriggerPayloadSchema>;

export const DeleteTriggerPayloadSchema = z.object({
  ownerAddr: z.string().nonempty(),
  chainId: ApertureSupportedChainIdEnum,
  taskId: z.number().nonnegative(),
});
export type DeleteTriggerPayload = z.infer<typeof DeleteTriggerPayloadSchema>;

const UpdateTriggerIdentifiersSchema = z.object({
  ownerAddr: z.string().nonempty(),
  chainId: ApertureSupportedChainIdEnum,
  taskId: z.number().nonnegative(),
});
export type UpdateTriggerIdentifiers = z.infer<
  typeof UpdateTriggerIdentifiersSchema
>;

export const UpdateTriggerClosePayloadSchema = z.object({
  identifiers: UpdateTriggerIdentifiersSchema,
  type: z.literal(ActionTypeEnum.enum.Close),
  slippage: SlippageSchema.optional(),
  maxGasProportion: MaxGasProportionSchema.optional(),
});
export type UpdateTriggerClosePayload = z.infer<
  typeof UpdateTriggerClosePayloadSchema
>;

export const UpdateTriggerLimitOrderClosePayloadSchema = z.object({
  identifiers: UpdateTriggerIdentifiersSchema,
  type: z.literal(ActionTypeEnum.enum.LimitOrderClose),
  maxGasProportion: MaxGasProportionSchema,
});
export type UpdateTriggerLimitOrderClosePayload = z.infer<
  typeof UpdateTriggerLimitOrderClosePayloadSchema
>;

export const UpdateTriggerReinvestPayloadSchema = z.object({
  identifiers: UpdateTriggerIdentifiersSchema,
  type: z.literal(ActionTypeEnum.enum.Reinvest),
  slippage: SlippageSchema.optional(),
  maxGasProportion: MaxGasProportionSchema.optional(),
});
export type UpdateTriggerReinvestPayload = z.infer<
  typeof UpdateTriggerReinvestPayloadSchema
>;

export const UpdateTriggerRebalancePayloadSchema = z.object({
  identifiers: UpdateTriggerIdentifiersSchema,
  type: z.literal(ActionTypeEnum.enum.Rebalance),
  tickLower: z.number().int().optional(),
  tickUpper: z.number().int().optional(),
  slippage: SlippageSchema.optional(),
  maxGasProportion: MaxGasProportionSchema.optional(),
});
export type UpdateTriggerRebalancePayload = z.infer<
  typeof UpdateTriggerRebalancePayloadSchema
>;

export const UpdateTriggerPayloadSchema = z.discriminatedUnion('type', [
  UpdateTriggerClosePayloadSchema,
  UpdateTriggerLimitOrderClosePayloadSchema,
  UpdateTriggerReinvestPayloadSchema,
  UpdateTriggerRebalancePayloadSchema,
]);
export type UpdateTriggerPayload = z.infer<typeof UpdateTriggerPayloadSchema>;

export const PermitInfoSchema = z
  .object({
    signature: z
      .string()
      .nonempty()
      .describe(
        'A raw signature that can be generated by https://docs.ethers.org/v5/api/signer/#Signer-signTypedData.',
      ),
    deadline: z.string().nonempty().describe('Unix timestamp in seconds.'),
  })
  .describe(
    'See https://eips.ethereum.org/EIPS/eip-4494 for information on the "permit" approval flow.',
  );
export type PermitInfo = z.infer<typeof PermitInfoSchema>;

export const CheckPositionPermitRequestSchema = z.object({
  chainId: ApertureSupportedChainIdEnum,
  tokenId: z.string().nonempty(),
});
export type CheckPositionPermitRequest = z.infer<
  typeof CheckPositionPermitRequestSchema
>;

export const UpdatePositionPermitRequestSchema = z.object({
  chainId: ApertureSupportedChainIdEnum,
  tokenId: z.string().nonempty(),
  permitInfo: PermitInfoSchema,
});
export type UpdatePositionPermitRequest = z.infer<
  typeof UpdatePositionPermitRequestSchema
>;

export const CreateTriggerRequestSchema = z.object({
  payload: CreateTriggerPayloadSchema,
  payloadSignature: z.string().nonempty(),
  permitInfo: PermitInfoSchema.optional().describe(
    "If Aperture doesn't already have authority over the position, " +
      'then `permitInfo` should be obtained from the user and populated here.',
  ),
});
export type CreateTriggerRequest = z.infer<typeof CreateTriggerRequestSchema>;

export const ListTriggerRequestSchema = z.object({
  ownerAddr: z.string().nonempty(),
  chainId: ApertureSupportedChainIdEnum,
  isLimitOrder: z.boolean(),
});
export type ListTriggerRequest = z.infer<typeof ListTriggerRequestSchema>;

export const LimitOrderInfoSchema = z.object({
  inputTokenAmount: TokenAmountSchema,
  outputTokenAmount: TokenAmountSchema,
  earnedFeeInputToken: z
    .string()
    .describe('The amount of fees in input token.'),
  earnedFeeOutputToken: z
    .string()
    .describe('The amount of fees in output token.'),
  feeTier: z.number(),
});
export type LimitOrderInfo = z.infer<typeof LimitOrderInfoSchema>;

export const TriggerItemSchema = z.object({
  taskId: z.number().nonnegative(),
  nftId: z.string().nonempty(),
  status: TriggerStatusEnum,
  lastFailedMessage: z.string().optional(),
  limitOrderInfo: LimitOrderInfoSchema.optional(),
  actionType: ActionTypeEnum,
});
export type TriggerItem = z.infer<typeof TriggerItemSchema>;

export const ListTriggerResponseSchema = z.object({
  triggers: z.array(TriggerItemSchema),
});
export type ListTriggerResponse = z.infer<typeof ListTriggerResponseSchema>;

export const DeleteTriggerRequestSchema = z.object({
  payload: DeleteTriggerPayloadSchema,
  payloadSignature: z.string().nonempty(),
});
export type DeleteTriggerRequest = z.infer<typeof DeleteTriggerRequestSchema>;

export const APIEventSchema = z.object({
  queryStringParameters: z.object({
    params: z.string().nonempty(),
  }),
});
export type APIEvent = z.infer<typeof APIEventSchema>;

export const UpdateTriggerRequestSchema = z.object({
  payload: UpdateTriggerPayloadSchema,
  payloadSignature: z.string().nonempty().describe('Signature of the payload.'),
});

export type UpdateTriggerRequest = z.infer<typeof UpdateTriggerRequestSchema>;
