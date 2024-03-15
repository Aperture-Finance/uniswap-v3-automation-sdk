import { z } from 'zod';

// A new thread will be created for the new conversation.
export const NewChatRequestSchema = z.object({
  message: z.string().describe('The message.'),
});
export type NewChatRequest = z.infer<typeof NewChatRequestSchema>;

export const ExistingChatRequestSchema = NewChatRequestSchema.extend({
  threadId: z.string().describe('The existing thread id to continue on.'),
});
export type ExistingChatRequest = z.infer<typeof ExistingChatRequestSchema>;

// Chat request is one of new chat request or an existing one.
export const IntentChatRequestSchema = NewChatRequestSchema.or(
  ExistingChatRequestSchema,
);
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
