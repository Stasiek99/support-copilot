import type { Conversation } from '@support-copilot/shared';
import { buildKnowledgeQuery } from './query';

const message = (id: number, author: 'customer' | 'agent', text: string) => ({
  id: `m-${id}`,
  author,
  text,
  sentAt: '2026-10-06T10:00:00Z',
});

const conversation: Conversation = {
  id: 'c-1',
  customerName: 'Test',
  subject: 'Late parcel',
  category: 'delivery',
  messages: [
    message(1, 'customer', 'first problem'),
    message(2, 'customer', 'second problem'),
    message(3, 'agent', 'agent reply that should be ignored'),
    message(4, 'customer', 'third problem'),
    message(5, 'customer', 'fourth problem'),
  ],
};

describe('buildKnowledgeQuery', () => {
  it('includes the subject and the last three customer messages only', () => {
    const query = buildKnowledgeQuery(conversation);
    expect(query).toContain('Late parcel');
    expect(query).toContain('second problem');
    expect(query).toContain('fourth problem');
    expect(query).not.toContain('first problem');
  });

  it('leaves out agent messages', () => {
    expect(buildKnowledgeQuery(conversation)).not.toContain('agent reply');
  });

  it('caps the query length', () => {
    const long = {
      ...conversation,
      messages: [message(1, 'customer', 'x'.repeat(2000))],
    };
    expect(buildKnowledgeQuery(long).length).toBeLessThanOrEqual(1000);
  });
});
