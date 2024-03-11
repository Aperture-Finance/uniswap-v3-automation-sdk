import { z } from 'zod';

import { AddressSchema, PayloadSignatureSchema } from './interfaces';

const SocialPlatformEnum = z.enum(['discord', 'twitter', 'telegram']);
export type E_SocialPlatform = z.infer<typeof SocialPlatformEnum>;

const RaffleTypeEnum = z.enum(['twitter', 'points']);
export type RaffleTypeEnum = z.infer<typeof RaffleTypeEnum>;

const RafflePrizeEnum = z.enum([
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

export const RaffleRequestSchema = z.object({
  type: RaffleTypeEnum.describe('Type of raffle to enter'),
  address: AddressSchema.describe('Address of the user entering the raffle'),
  inviteCode: z.string(),
});
export type RaffleRequest = z.infer<typeof RaffleRequestSchema>;

export const RaffleResponesSchema = z.object({
  prize: RafflePrizeEnum.describe('Prize won in the raffle'),
});
export type RaffleResponse = z.infer<typeof RaffleResponesSchema>;
