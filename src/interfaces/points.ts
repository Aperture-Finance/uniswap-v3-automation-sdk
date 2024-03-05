import { z } from 'zod';

import { PayloadSignatureSchema } from './interfaces';

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

export const LeaderboardUserResponseSchema = z.object({
  userAddr: z.string(),
  points: z.number().nonnegative(),
  referred_users: z.array(LeaderboardUserResponseSchema),
});

export const ListLeaderboardRequestSchema = z.object({
  // Since it can be pretty expensive to find top 1000 users and their referred users, good idea to cache
  // to results to re-compute at most 1x every ~5 minutes.
  // Seems like api caching can already be enabled https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-api.html
});

export type ListLeaderboardRequest = z.infer<
  typeof LeaderboardRequestSchema
>;

export const ListLeaderboardResponseSchema = z.object({
  uers: z.array(LeaderboardUserResponseSchema).describe('Top 1000 users, their earned points, and their referred users'),
});

export type ListLeaderboardResponse = z.infer<typeof ListLeaderboardResponseSchema>;