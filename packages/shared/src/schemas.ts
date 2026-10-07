import { z } from 'zod';

export const CATEGORIES = ['payments', 'delivery', 'returns', 'account'] as const;

export const categorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof categorySchema>;

export const MAX_MESSAGE_LENGTH = 2000;

export const messageSchema = z.object({
  id: z.string().min(1),
  author: z.enum(['customer', 'agent']),
  text: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  sentAt: z.iso.datetime(),
});
export type Message = z.infer<typeof messageSchema>;

export const conversationSchema = z.object({
  id: z.string().min(1),
  customerName: z.string().min(1),
  subject: z.string().min(1).max(120),
  category: categorySchema,
  messages: z.array(messageSchema).min(1),
});
export type Conversation = z.infer<typeof conversationSchema>;
