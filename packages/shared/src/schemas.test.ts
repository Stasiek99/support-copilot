import { CATEGORIES, conversationSchema, messageSchema, MAX_MESSAGE_LENGTH } from './schemas';
import { seedConversations } from './seed/conversations';

describe('messageSchema', () => {
  const valid = { id: 'm-1', author: 'customer', text: 'Hello', sentAt: '2026-10-06T10:00:00Z' };

  it('accepts a valid message', () => {
    expect(messageSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an unknown author', () => {
    expect(messageSchema.safeParse({ ...valid, author: 'bot' }).success).toBe(false);
  });

  it('rejects empty and overlong text', () => {
    expect(messageSchema.safeParse({ ...valid, text: '' }).success).toBe(false);
    const tooLong = 'x'.repeat(MAX_MESSAGE_LENGTH + 1);
    expect(messageSchema.safeParse({ ...valid, text: tooLong }).success).toBe(false);
  });

  it('rejects a non-ISO timestamp', () => {
    expect(messageSchema.safeParse({ ...valid, sentAt: 'yesterday' }).success).toBe(false);
  });
});

describe('conversationSchema', () => {
  it('rejects a conversation without messages', () => {
    const result = conversationSchema.safeParse({
      id: 'c-1',
      customerName: 'A',
      subject: 'S',
      category: 'payments',
      messages: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('seedConversations', () => {
  it('contains 8 conversations with unique ids', () => {
    expect(seedConversations).toHaveLength(8);
    expect(new Set(seedConversations.map((c) => c.id)).size).toBe(8);
  });

  it('covers every category', () => {
    const covered = new Set(seedConversations.map((c) => c.category));
    expect([...covered].sort()).toEqual([...CATEGORIES].sort());
  });

  it('starts every conversation with a customer message', () => {
    for (const conversation of seedConversations) {
      expect(conversation.messages[0]?.author).toBe('customer');
    }
  });
});
