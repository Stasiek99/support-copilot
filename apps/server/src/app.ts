import { randomUUID } from 'node:crypto';
import { seedConversations } from '@support-copilot/shared';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { errorHandler, notFoundHandler } from './http/errors';
import type { LlmProvider } from './llm/provider';
import { createAssistRouter } from './routes/assist';

export interface AppOptions {
  provider: LlmProvider;
  logger: Logger;
  rateLimitPerMin: number;
  streamTimeoutMs: number;
  trustProxy: number;
}

const SAFE_REQUEST_ID = /^[\w-]{1,64}$/;

export function createApp({
  provider,
  logger,
  rateLimitPerMin,
  streamTimeoutMs,
  trustProxy,
}: AppOptions): Express {
  const app = express();
  app.set('trust proxy', trustProxy);

  app.use(helmet());
  app.use(
    pinoHttp({
      logger,
      // Correlation ID: reuse a well-formed incoming ID, otherwise generate one.
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id =
          typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/api/health' },
      // Log only what is needed to correlate; never headers, query strings or bodies.
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          path: req.url.split('?')[0],
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(express.json({ limit: '128kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', provider: provider.name });
  });
  app.get('/api/conversations', (_req, res) => {
    res.json(seedConversations);
  });
  app.use('/api/assist', createAssistRouter({ provider, rateLimitPerMin, streamTimeoutMs }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
