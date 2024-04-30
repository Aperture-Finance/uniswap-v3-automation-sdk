import { z } from 'zod';

import {
  AddressSchema,
  GeneralResponseSchema,
  PayloadSignatureSchema,
} from './interfaces';

const SocialPlatformEnum = z.enum(['discord', 'twitter', 'telegram']);
export type E_SocialPlatform = z.infer<typeof SocialPlatformEnum>;

export const RaffleTypeEnum = z.enum(['twitter', 'points', 'daily']);
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

export const LeaderboardTypeEnum = z.enum(['points', 'referrals', 'streak']);
export type LeaderboardTypeEnum = z.infer<typeof LeaderboardTypeEnum>;

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

export const SocialLoginRequestSchema = z.object({
  code: z.string(),
  platform: SocialPlatformEnum,
});

export type SocialLoginRequest = z.infer<typeof SocialLoginRequestSchema>;

export const SocialLoginResponseSchema = GeneralResponseSchema.extend({
  userKey: z.string(),
});

export type SocialLoginResponse = z.infer<typeof SocialLoginResponseSchema>;

export const BindSocialAccountRequestSchema = PayloadSignatureSchema.extend({
  payload: BasePayloadSchema.extend({
    userKey: z.string(),
  }),
});

export type BindSocialAccountRequest = z.infer<
  typeof BindSocialAccountRequestSchema
>;

export const VerifySocialAccountResponseSchema = GeneralResponseSchema.extend({
  message: z.string().optional(),
  retroPoints: z.number().nonnegative().optional(),
});

export type VerifySocialAccountResponse = z.infer<
  typeof VerifySocialAccountResponseSchema
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

export const ListLeaderboardRequestSchema = z.object({
  type: LeaderboardTypeEnum.describe(
    'Type of leaderboard for sorting.',
  ).optional(),
});
export type ListLeaderboardRequest = z.infer<
  typeof ListLeaderboardRequestSchema
>;

export const LeaderboardUserResponseSchema = z.object({
  x_id: z.string(),
  userAddr: z.string(),
  points: z.number().nonnegative(),
  num_referred_users: z.number().int(),
  streak: z.number().int(),
});

export const ListLeaderboardResponseSchema = z.object({
  totalCampaignUsers: z.number().int().nonnegative(),
  totalCampaignPoints: z.number().nonnegative(),
  users: z
    .array(LeaderboardUserResponseSchema)
    .describe(
      "List top 1000 wallet's { address, points, numReferrals, streak } ordered by type.",
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
  streak: z.number().int(),
  canDrawDailyRaffle: z.boolean(),
  hasCompletedOnChainActivityForPoints: z.boolean(),
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
    .describe('Immediately updated total points after raffling.'),
  prizeV2: z
    .number()
    .positive()
    .describe('Points won from the raffle. If exists, use to replace prize.'),
});
export type RaffleResponse = z.infer<typeof RaffleResponesSchema>;
