import { fileURLToPath } from 'node:url';
import { seedConversations } from '@support-copilot/shared';
import { pino } from 'pino';
import { loadConfig } from '../src/config';
import { createProvider } from '../src/llm/createProvider';
import { loadKnowledgeBase } from '../src/rag/knowledgeBase';
import { buildKnowledgeQuery } from '../src/rag/query';

const CONVERSATION_IDS = ['c-1001', 'c-1008'];

const config = loadConfig({ ...process.env, LLM_PROVIDER: 'anthropic' });
const logger = pino({ level: 'info' });
const provider = createProvider(config, logger);
const knowledge = await loadKnowledgeBase(
  fileURLToPath(new URL('../../../knowledge', import.meta.url)),
);

console.log(`model: ${config.ANTHROPIC_MODEL}`);

for (const id of CONVERSATION_IDS) {
  const conversation = seedConversations.find((candidate) => candidate.id === id);
  if (!conversation) throw new Error(`Unknown seed conversation ${id}`);

  const sources = knowledge.search(buildKnowledgeQuery(conversation));
  const signal = AbortSignal.timeout(config.STREAM_TIMEOUT_MS);

  console.log(`\n=== ${id}: ${conversation.subject}`);
  console.log(`sources: ${sources.map((source) => source.id).join(', ') || '(none)'}`);

  process.stdout.write('suggestion: ');
  for await (const chunk of provider.suggestReply(conversation, { signal, sources })) {
    process.stdout.write(chunk);
  }
  console.log();

  console.log(
    'analysis:',
    JSON.stringify(await provider.analyze(conversation, { signal }), null, 2),
  );
}
