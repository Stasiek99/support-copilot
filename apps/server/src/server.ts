import { pino } from 'pino';
import { createApp } from './app';
import { loadConfig } from './config';
import { createProvider } from './llm/createProvider';

const config = loadConfig();

const logger = pino({
  level: config.LOG_LEVEL,
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  ...(process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});

const provider = createProvider(config);
const app = createApp({
  provider,
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
  logger.info({ port: config.PORT, provider: provider.name }, 'server listening');
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
  // Streams can keep connections open; do not hang forever.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
