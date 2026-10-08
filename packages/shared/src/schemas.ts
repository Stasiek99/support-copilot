import { z } from 'zod';

export const CATEGORIES = ['payments', 'delivery', 'returns', 'account'] as const;

export const categorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof categorySchema>;

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_MESSAGES_PER_CONVERSATION = 50;
/** Upper bound for all message text sent to the LLM in one request (cost + injection surface). */
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

/** Request body for the assist endpoints: a conversation within the total size budget. */
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

/** Structured analysis of a conversation. Always validated, including model output. */
export const analysisSchema = z.object({
  summary: z.string().min(1).max(600),
  intent: z.enum(INTENTS),
  sentiment: z.enum(SENTIMENTS),
});
export type Analysis = z.infer<typeof analysisSchema>;
export type Intent = Analysis['intent'];
export type Sentiment = Analysis['sentiment'];

/** Events sent over SSE by POST /api/assist/suggestion. */
export const streamEventSchema = z.discriminatedUnion('type', [
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
