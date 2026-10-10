import { z } from 'zod';

export const CATEGORIES = ['payments', 'delivery', 'returns', 'account'] as const;

export const categorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof categorySchema>;

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_MESSAGES_PER_CONVERSATION = 50;
export const MAX_CONTEXT_CHARS = 20_000;

export const messageSchema = z.object({
  id: z.string().min(1),
  author: z.enum(['customer', 'agent']),
  text: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  sentAt: z.iso.datetime(),
});
export type Message = z.infer<typeof messageSchema>;

export const conversationSchema = z.object({
  id: z.string().min(1).max(64),
  customerName: z.string().min(1).max(100),
  subject: z.string().min(1).max(120),
  category: categorySchema,
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES_PER_CONVERSATION),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const assistRequestSchema = conversationSchema.refine(
  (conversation) =>
    conversation.messages.reduce((total, message) => total + message.text.length, 0) <=
    MAX_CONTEXT_CHARS,
  { message: `Conversation text exceeds ${MAX_CONTEXT_CHARS} characters`, path: ['messages'] },
);
export type AssistRequest = z.infer<typeof assistRequestSchema>;

export const INTENTS = [
  'payment_issue',
  'delivery_status',
  'return_request',
  'account_access',
  'other',
] as const;
export const SENTIMENTS = ['negative', 'neutral', 'positive'] as const;

export const analysisSchema = z.object({
  summary: z.string().min(1).max(600),
  intent: z.enum(INTENTS),
  sentiment: z.enum(SENTIMENTS),
});
export type Analysis = z.infer<typeof analysisSchema>;
export type Intent = Analysis['intent'];
export type Sentiment = Analysis['sentiment'];

export const sourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  text: z.string().min(1).max(1500),
});
export type Source = z.infer<typeof sourceSchema>;

export const streamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('sources'), sources: z.array(sourceSchema) }),
  z.object({ type: z.literal('delta'), text: z.string() }),
  z.object({ type: z.literal('done') }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);
export type StreamEvent = z.infer<typeof streamEventSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(['invalid_request', 'rate_limited', 'not_found', 'internal_error']),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
