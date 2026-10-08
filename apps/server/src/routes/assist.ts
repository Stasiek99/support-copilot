import { assistRequestSchema } from '@support-copilot/shared';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { sendError } from '../http/errors';
import { startEventStream, writeEvent } from '../http/sse';
import { parseBody } from '../http/validate';
import type { LlmProvider } from '../llm/provider';

export interface AssistRouterOptions {
  provider: LlmProvider;
  rateLimitPerMin: number;
  streamTimeoutMs: number;
}

export function createAssistRouter({
  provider,
  rateLimitPerMin,
  streamTimeoutMs,
}: AssistRouterOptions): Router {
  const router = Router();

  router.use(
    rateLimit({
      windowMs: 60_000,
      limit: rateLimitPerMin,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (req, res) => {
        sendError(res, String(req.id), 429, 'rate_limited', 'Too many requests, slow down');
      },
    }),
  );

  router.post('/analysis', async (req, res) => {
    const conversation = parseBody(assistRequestSchema, req.body);

    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(streamTimeoutMs)]);

    const analysis = await provider.analyze(conversation, { signal });
    res.json(analysis);
  });

  router.post('/suggestion', async (req, res) => {
    // Validate before opening the stream so bad input gets a regular JSON 400.
    const conversation = parseBody(assistRequestSchema, req.body);

    const controller = new AbortController();
    let clientGone = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        clientGone = true;
        controller.abort();
      }
    });
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(streamTimeoutMs)]);

    startEventStream(res);
    try {
      for await (const text of provider.suggestReply(conversation, { signal })) {
        writeEvent(res, { type: 'delta', text });
      }
      writeEvent(res, { type: 'done' });
    } catch (error) {
      if (!clientGone) {
        req.log.error({ err: error }, 'suggestion stream failed');
        writeEvent(res, {
          type: 'error',
          message: 'Could not generate a suggestion. Please try again.',
        });
      }
    } finally {
      res.end();
    }
  });

  return router;
}
