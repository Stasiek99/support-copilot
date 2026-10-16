import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { seedConversations } from '@support-copilot/shared';
import express, { type Express, Router } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { errorHandler, notFoundHandler } from './http/errors';
import type { LlmProvider } from './llm/provider';
import type { KnowledgeBase } from './rag/knowledgeBase';
import { createAssistRouter } from './routes/assist';

export interface AppOptions {
  provider: LlmProvider;
  knowledge: KnowledgeBase;
  logger: Logger;
  rateLimitPerMin: number;
  streamTimeoutMs: number;
  trustProxy: number;
  /** Built web app to serve next to the API (single-origin deploy). Omit in dev, where Vite serves it. */
  staticDir?: string;
}

const SAFE_REQUEST_ID = /^[\w-]{1,64}$/;

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/**
 * Serves the built web app. Vite fingerprints everything under /assets, so it can be cached
 * forever; every other file (index.html, theme-init.js, icons) must be revalidated so a new deploy
 * is picked up immediately. Unknown GET paths fall back to index.html (client-side routing),
 * but /api and anything that looks like a file never do: a mistyped API call must stay a JSON 404,
 * and a missing /assets chunk (stale tab after a deploy) must 404 instead of returning HTML as JS.
 */
export function createStaticRouter(staticDir: string): Router {
  const root = path.resolve(staticDir);
  const router = Router();

  router.use(
    express.static(root, {
      index: false,
      setHeaders(res, filePath) {
        const fingerprinted = path.relative(root, filePath).split(path.sep)[0] === 'assets';
        res.setHeader(
          'Cache-Control',
          fingerprinted ? `public, max-age=${ONE_YEAR_SECONDS}, immutable` : 'no-cache',
        );
      },
    }),
  );
  router.get('/{*splat}', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/') || path.extname(req.path))
      return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile('index.html', { root }, (error) => {
      if (error) next(error);
    });
  });
  return router;
}

export function createApp({
  provider,
  knowledge,
  logger,
  rateLimitPerMin,
  streamTimeoutMs,
  trustProxy,
  staticDir,
}: AppOptions): Express {
  const app = express();
  app.set('trust proxy', trustProxy);

  app.use(helmet());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id =
          typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/api/health' },
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
  app.use(
    '/api/assist',
    createAssistRouter({ provider, knowledge, rateLimitPerMin, streamTimeoutMs }),
  );

  if (staticDir) app.use(createStaticRouter(staticDir));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
