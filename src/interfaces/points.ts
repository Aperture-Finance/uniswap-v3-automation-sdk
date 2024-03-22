import { z } from 'zod';

import {
  AddressSchema,
  GeneralResponseSchema,
  PayloadSignatureSchema,
} from './interfaces';

const SocialPlatformEnum = z.enum(['discord', 'twitter', 'telegram']);
export type E_SocialPlatform = z.infer<typeof SocialPlatformEnum>;

export const RaffleTypeEnum = z.enum(['twitter', 'points']);
export type RaffleTypeEnum = z.infer<typeof RaffleTypeEnum>;

export const RafflePrizeEnum = z.enum([
  'Plus50Points',
  'Plus100Points',
  'Plus150Points',
  'Boost5Percent',
  'Boost10Percent',
  'Boost20Percent',
]);
export type RafflePrizeEnum = z.infer<typeof RafflePrizeEnum>;

const BasePayloadSchema = z.object({
  ownerAddr: z.string(),
});

export const VerifySocialAccountRequestSchema = PayloadSignatureSchema.extend({
  payload: BasePayloadSchema.extend({
    platform: SocialPlatformEnum,
    code: z.string(),
  }),
  callbackUrl: z.string().optional(),
});

export type VerifySocialAccountRequest = z.infer<
  typeof VerifySocialAccountRequestSchema
>;

export const VerifySocialAccountResponseSchema = z.object({
  error: z.boolean(),
  message: z.string().optional(),
  retro_points: z.number().nonnegative().optional(),
});

export type VerifySocialAccountResponse = z.infer<
  typeof VerifySocialAccountRequestSchema
>;

export const AcceptInviteRequestSchema = PayloadSignatureSchema.extend({
  payload: BasePayloadSchema.extend({
    inviteCode: z.string(),
  }),
});

export type AcceptInviteRequest = z.infer<typeof AcceptInviteRequestSchema>;

export const ValidateInviteCodeRequestSchema = z.object({
  inviteCode: z.string(),
});

export type ValidateInviteCodeRequest = z.infer<
  typeof ValidateInviteCodeRequestSchema
>;

export const LeaderboardUserResponseSchema = z.object({
  x_id: z.string(),
  userAddr: z.string(),
  points: z.number().nonnegative(),
  num_referred_users: z.number().int(),
});

export const ListLeaderboardResponseSchema = z.object({
  users: z
    .array(LeaderboardUserResponseSchema)
    .describe(
      'Lists top users and their earned points, number of referred users, and x_id',
    ),
});

export type ListLeaderboardResponse = z.infer<
  typeof ListLeaderboardResponseSchema
>;

export const PointUserStatusSchema = z.object({
  userAddress: AddressSchema,
  inviteCode: z.string(),
  xBound: z.boolean(),
  discordBound: z.boolean(),
  telegramBound: z.boolean(),
  referer: AddressSchema,
  referredCount: z.number().int(),
  points: z.number().nonnegative(),
  referralPoints: z.number().nonnegative(),
  twitterFreeRaffleConsumed: z.boolean(),
  rafflePointsConsumed: z.number().nonnegative(),
});

export type PointUserStatus = z.infer<typeof PointUserStatusSchema>;

export const PointUserStatusResponseSchema = GeneralResponseSchema.extend({
  userStatus: PointUserStatusSchema,
});

export type PointUserStatusResponse = z.infer<
  typeof PointUserStatusResponseSchema
>;

export const GetPointUserStatusRequestSchema = z.object({
  userAddress: AddressSchema,
});

export type GetPointUserStatusRequest = z.infer<
  typeof GetPointUserStatusRequestSchema
>;

export const RaffleRequestSchema = z.object({
  type: RaffleTypeEnum.describe('Type of raffle to enter'),
  address: AddressSchema.describe('Address of the user entering the raffle'),
  inviteCode: z.string(),
});
export type RaffleRequest = z.infer<typeof RaffleRequestSchema>;

export const RaffleResponesSchema = z.object({
  prize: RafflePrizeEnum.describe('Prize won in the raffle'),
  points: z
    .number()
    .positive()
    .describe('The immediately updated points after raffling.'),
});
export type RaffleResponse = z.infer<typeof RaffleResponesSchema>;
