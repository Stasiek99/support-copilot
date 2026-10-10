import { fileURLToPath } from 'node:url';
import { pino } from 'pino';
import { createApp } from './app';
import { loadConfig } from './config';
import { createProvider } from './llm/createProvider';
import { loadKnowledgeBase } from './rag/knowledgeBase';

const config = loadConfig();

const logger = pino({
  level: config.LOG_LEVEL,
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  ...(process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});

const provider = createProvider(config);
const knowledgeDir =
  config.KNOWLEDGE_DIR ?? fileURLToPath(new URL('../../../knowledge', import.meta.url));
const knowledge = await loadKnowledgeBase(knowledgeDir);
const app = createApp({
  provider,
  knowledge,
  logger,
  rateLimitPerMin: config.RATE_LIMIT_PER_MIN,
  streamTimeoutMs: config.STREAM_TIMEOUT_MS,
  trustProxy: config.TRUST_PROXY,
});

const server = app.listen(config.PORT, (error) => {
  if (error) {
    logger.fatal({ err: error }, 'failed to start server');
    process.exit(1);
  }
  logger.info({ port: config.PORT, provider: provider.name, knowledgeDir }, 'server listening');
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
