import {
  analysisSchema,
  assistRequestSchema,
  MAX_CONTEXT_CHARS,
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGES_PER_CONVERSATION,
  streamEventSchema,
} from './schemas';
import { seedConversations } from './seed/conversations';

const base = seedConversations[0]!;

function conversationWithMessages(count: number, textLength: number) {
  return {
    ...base,
    messages: Array.from({ length: count }, (_, index) => ({
      id: `m-${index}`,
      author: 'customer' as const,
      text: 'x'.repeat(textLength),
      sentAt: '2026-10-06T10:00:00Z',
    })),
  };
}

describe('assistRequestSchema', () => {
  it('accepts every seed conversation', () => {
    for (const conversation of seedConversations) {
      expect(assistRequestSchema.safeParse(conversation).success).toBe(true);
    }
  });

  it('rejects more messages than the cap', () => {
    const result = assistRequestSchema.safeParse(
      conversationWithMessages(MAX_MESSAGES_PER_CONVERSATION + 1, 10),
    );
    expect(result.success).toBe(false);
  });

  it('rejects a conversation whose total text exceeds the context budget', () => {
    const count = Math.ceil(MAX_CONTEXT_CHARS / MAX_MESSAGE_LENGTH) + 1;
    const result = assistRequestSchema.safeParse(
      conversationWithMessages(count, MAX_MESSAGE_LENGTH),
    );
    expect(result.success).toBe(false);
  });
});

describe('analysisSchema', () => {
  const valid = {
    summary: 'Customer asks about a refund.',
    intent: 'return_request',
    sentiment: 'neutral',
  };

  it('accepts a valid analysis', () => {
    expect(analysisSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects unknown intents and sentiments', () => {
    expect(analysisSchema.safeParse({ ...valid, intent: 'hack' }).success).toBe(false);
    expect(analysisSchema.safeParse({ ...valid, sentiment: 'angry' }).success).toBe(false);
  });

  it('rejects extra-long summaries', () => {
    expect(analysisSchema.safeParse({ ...valid, summary: 'x'.repeat(601) }).success).toBe(false);
  });
});

describe('streamEventSchema', () => {
  it('parses delta, done and error events', () => {
    expect(streamEventSchema.parse({ type: 'delta', text: 'Hi' })).toEqual({
      type: 'delta',
      text: 'Hi',
    });
    expect(streamEventSchema.parse({ type: 'done' })).toEqual({ type: 'done' });
    expect(streamEventSchema.parse({ type: 'error', message: 'Oops' }).type).toBe('error');
  });

  it('rejects unknown event types', () => {
    expect(streamEventSchema.safeParse({ type: 'other' }).success).toBe(false);
  });
});
