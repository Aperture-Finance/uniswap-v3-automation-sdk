import { FeeAmount } from '@uniswap/v3-sdk';
import { z } from 'zod';

export enum ApertureSupportedChainId {
  ETHEREUM_MAINNET_CHAIN_ID = 1,
  ARBITRUM_MAINNET_CHAIN_ID = 42161,
  GOERLI_TESTNET_CHAIN_ID = 5,
  ARBITRUM_GOERLI_TESTNET_CHAIN_ID = 421613,
}

const ApertureSupportedChainIdEnum = z.nativeEnum(ApertureSupportedChainId);

export const ConditionTypeString = {
  Time: 'Time',
  TokenAmount: 'TokenAmount',
  Price: 'Price',
  AccruedFees: 'AccruedFees',
} as const;
const ConditionTypeEnum = z.nativeEnum(ConditionTypeString);
export type ConditionTypeEnum = z.infer<typeof ConditionTypeEnum>;

export const ActionTypeString = {
  Close: 'Close',
  LimitOrderClose: 'LimitOrderClose',
  Reinvest: 'Reinvest',
  Rebalance: 'Rebalance',
} as const;
const ActionTypeEnum = z.nativeEnum(ActionTypeString);
export type ActionTypeEnum = z.infer<typeof ActionTypeEnum>;

// TODO: Create a constant for the maximum allowed `maxGasProportion` that matches Automan setting and use it here.
const MaxGasProportionSchema = z.number().positive().lte(0.5);

const SlippageSchema = z.number().nonnegative().lte(1);

export const TriggerStatusString = {
  CREATED: 'CREATED',
  STARTED: 'STARTED',
  COMPLETED: 'COMPLETED',
  INVALID: 'INVALID',
  DELETED: 'DELETED',
} as const;
const TriggerStatusEnum = z.nativeEnum(TriggerStatusString);
export type TriggerStatusEnum = z.infer<typeof TriggerStatusEnum>;

export const TokenAmountSchema = z.object({
  // The ERC-20 token contract address.
  address: z.string().nonempty(),
  // The raw amount, which is the human readable format multiplied by the token
  // decimal.
  rawAmount: z.string().nonempty(),
});
export type TokenAmount = z.infer<typeof TokenAmountSchema>;

export const TimeConditionSchema = z.object({
  type: z.literal(ConditionTypeString.Time),
  // The condition is considered met if the current time meets or exceeds `timeAfterEpochSec`.
  // This timestamp threshold is specified as the number of seconds since UNIX epoch.
  timeAfterEpochSec: z.number().int().positive(),
});
export type TimeCondition = z.infer<typeof TimeConditionSchema>;

export const TokenAmountConditionSchema = z.object({
  type: z.literal(ConditionTypeString.TokenAmount),
  // The condition is considered met if the specified token has a zero (principal) amount in the position.
  // `zeroAmountToken` can only be either 0 or 1, representing token0 or token1 in the position, respectively.
  // For example, if `zeroAmountToken` is 1, then the condition is considered met if token1 in the position is exactly zero.
  // Note that only the principal amount is considered; accrued fees are not.
  zeroAmountToken: z.union([z.literal(0), z.literal(1)]),
});
export type TokenAmountCondition = z.infer<typeof TokenAmountConditionSchema>;

// The price condition compares token0's price denominated in token1 against a specified threshold.
// We follow how a Uniswap V3 liquidity pool defines price, i.e. how much raw token1 equals 1 raw token0 in value.
// "Raw" means the raw uint256 integer amount used in the token contract.
// For example, if token A uses 8 decimals, then 1 raw token A represents 10^(-8) tokens in human-readable form.
export const PriceConditionSchema = z.object({
  type: z.literal(ConditionTypeString.Price),
  // Exactly one of `gte` and `lte` should be defined; the other must be `undefined`.
  // The defined float value represents the price threshold to compare against.
  // If `gte` is set, the condition is considered met if the current price >= `gte`.
  // Otherwise, the condition is considered met if the current price <= `lte`.
  gte: z.number().positive().optional(),
  lte: z.number().positive().optional(),
  // If set, the condition is only considered met if the price remains satisfaction the threshold requirement for at least the past `durationSec` seconds.
  // For example, if `gte` is 10 and `durationSec` is set to 3600, then the condition is only considered met if the price remains >= 10 for the entire past hour.
  // The historical price feed used is Coingecko.
  durationSec: z.number().int().positive().optional(),
});
export type PriceCondition = z.infer<typeof PriceConditionSchema>;

// The accrued-fees condition specifies a threshold in the form of the ratio between the value of accrued fees and that of principal tokens in a specific liquidity position.
// This condition serves "auto-compound" which triggers a "reinvest" action whenever the accrued fees meet the threshold specified in this condition.
export const AccruedFeesConditionSchema = z.object({
  type: z.literal(ConditionTypeString.AccruedFees),
  feeToPrincipalRatioThreshold: z.number().positive(),
});
export type AccruedFeesCondition = z.infer<typeof AccruedFeesConditionSchema>;

export const ConditionSchema = z.union([
  TimeConditionSchema,
  TokenAmountConditionSchema,
  PriceConditionSchema,
  AccruedFeesConditionSchema,
]);
export type Condition = z.infer<typeof ConditionSchema>;

// Close a position, and send both tokens (principal and collected fees) to the position owner.
export const CloseActionSchema = z.object({
  type: z.literal(ActionTypeString.Close),
  // A number between 0 and 1, inclusive. Digits after the sixth decimal point are ignored, i.e. the precision is 0.000001.
  slippage: SlippageSchema,
  // Aperture deducts tokens from the position to cover the cost of performing this action (gas).
  // The `maxGasProportion` value represents the largest allowed proportion of the position value to be deducted.
  // For example, a `maxGasProportion` of 0.10 represents 10% of the position, i.e. no more than 10% of the position's tokens (principal and accrued fees) may be deducted.
  // If network gas price is high and the deduction would exceed the specified ceiling, then the action will not be triggered.
  maxGasProportion: MaxGasProportionSchema,
});
export type CloseAction = z.infer<typeof CloseActionSchema>;

// Same as 'Close' but the position serves a limit order placed on Aperture.
// No slippage needs to be specified as limit order positions are always closed with a zero slippage setting.
export const LimitOrderCloseActionSchema = z.object({
  type: z.literal(ActionTypeString.LimitOrderClose),
  inputTokenAmount: TokenAmountSchema,
  outputTokenAddr: z.string().nonempty(),
  feeTier: z.nativeEnum(FeeAmount),
  maxGasProportion: MaxGasProportionSchema,
});
export type LimitOrderCloseAction = z.infer<typeof LimitOrderCloseActionSchema>;

// Claims accrued fees, swap them to the same ratio as the principal amounts, and add liquidity.
export const ReinvestActionSchema = z.object({
  type: z.literal(ActionTypeString.Reinvest),
  slippage: SlippageSchema,
  maxGasProportion: MaxGasProportionSchema,
});
export type ReinvestAction = z.infer<typeof ReinvestActionSchema>;

// Close a position, and swap tokens (principal and collected fees) to the ratio required by the specified new price range, and open a position with that price range.
export const RebalanceActionSchema = z.object({
  type: z.literal(ActionTypeString.Rebalance),
  tickLower: z.number().int(),
  tickUpper: z.number().int(),
  slippage: SlippageSchema,
  maxGasProportion: MaxGasProportionSchema,
});
export type RebalanceAction = z.infer<typeof RebalanceActionSchema>;

export const ActionSchema = z.union([
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

export const PayloadSchema = z.union([
  CreateTriggerPayloadSchema,
  DeleteTriggerPayloadSchema,
]);
export type Payload = z.infer<typeof PayloadSchema>;

// See https://eips.ethereum.org/EIPS/eip-4494 for information on the "permit" approval flow.
export const PermitInfoSchema = z.object({
  // A raw signature that can be generated by https://docs.ethers.org/v5/api/signer/#Signer-signTypedData.
  signature: z.string().nonempty(),
  // Unix timestamp in seconds.
  deadline: z.number().int().positive(),
});
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
  // If Aperture doesn't already have authority over the position specified in `payload`, then `permitInfo` should be obtained from the user and populated here.
  permitInfo: PermitInfoSchema.optional(),
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
  // The amount of fees in input token.
  earnedFeeInputToken: z.string(),
  // The amount of fees in output token.
  earnedFeeOutputToken: z.string(),
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
