import type { Conversation } from '@support-copilot/shared';

const CUSTOMER_MESSAGES_IN_QUERY = 3;
const MAX_QUERY_CHARS = 1000;

export function buildKnowledgeQuery(conversation: Conversation): string {
  const customerText = conversation.messages
    .filter((message) => message.author === 'customer')
    .slice(-CUSTOMER_MESSAGES_IN_QUERY)
    .map((message) => message.text);

  return [conversation.subject, ...customerText].join('\n').slice(0, MAX_QUERY_CHARS);
}
