import { z } from 'zod';

import { GeneralResponseSchema, PayloadSignatureSchema } from './interfaces';

const SocialPlatformEnum = z.enum(['discord', 'twitter', 'telegram']);
export type E_SocialPlatform = z.infer<typeof SocialPlatformEnum>;

const BasePayloadSchema = z.object({
  ownerAddr: z.string(),
});

export const VerifySocialAccountRequestSchema = PayloadSignatureSchema.extend({
  payload: BasePayloadSchema.extend({
    platform: SocialPlatformEnum,
    code: z.string(),
  }),
});

export type VerifySocialAccountRequest = z.infer<
  typeof VerifySocialAccountRequestSchema
>;

export const AcceptInviteRequestSchema = PayloadSignatureSchema.extend({
  payload: BasePayloadSchema.extend({
    inviteCode: z.string(),
  }),
});

export type AcceptInviteRequest = z.infer<typeof AcceptInviteRequestSchema>;

export type AcceptInviteRequest = z.infer<typeof AcceptInviteRequestSchema>;

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
  userAddress: z.string(),
  inviteCode: z.number().nonnegative(),
  xBound: z.boolean(),
  discordBound: z.boolean(),
  telegramBound: z.boolean(),
  referer: z.string(),
  referredCount: z.number().int(),
  points: z.number().nonnegative(),
  referalPoints: z.number().nonnegative(),
});

export type PointUserStatus = z.infer<typeof PointUserStatusSchema>;

export const PointUserStatusResponseSchema = GeneralResponseSchema.extend({
  userStatus: PointUserStatusSchema,
});

export type PointUserStatusResponse = z.infer<
  typeof PointUserStatusResponseSchema
>;
