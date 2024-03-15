import { z } from 'zod';

// Chat request is one of new chat request or an existing one.
export const IntentChatRequestSchema = z.object({
  threadId: z
    .string()
    .optional()
    .describe('The existing thread id to continue on.'),
  message: z.string().describe('The message.'),
});

export type IntentChatRequest = z.infer<typeof IntentChatRequestSchema>;

export const MessagesSchema = z.array(
  z.object({
    role: z.enum(['user', 'assistant']),
    message: z.string(),
    timestampSecs: z.number().nonnegative(),
  }),
);
export type Messages = z.infer<typeof MessagesSchema>;

export const IntentChatResponseSchema = z.object({
  threadId: z.string(),
  messages: MessagesSchema,
});
export type IntentChatResponse = z.infer<typeof IntentChatResponseSchema>;

export const IntentListMessagesRequestSchema = z.object({
  threadId: z.string(),
});
export type IntentListMessagesRequest = z.infer<
  typeof IntentListMessagesRequestSchema
>;
