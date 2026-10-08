import {
  apiErrorSchema,
  analysisSchema,
  seedConversations,
  streamEventSchema,
  type Analysis,
  type Conversation,
  type StreamEvent,
} from '@support-copilot/shared';
import { pino } from 'pino';
import request from 'supertest';
import { createApp, type AppOptions } from './app';
import { MockProvider } from './llm/mockProvider';
import type { LlmProvider } from './llm/provider';

const anna = seedConversations[0]!;

function buildApp(overrides: Partial<AppOptions> = {}) {
  return createApp({
    provider: new MockProvider({ tokenDelayMs: 0, analysisDelayMs: 0 }),
    logger: pino({ level: 'silent' }),
    rateLimitPerMin: 1000,
    streamTimeoutMs: 5000,
    trustProxy: 0,
    ...overrides,
  });
}

/** Collects the raw SSE body so supertest does not try to parse it. */
function readStream(test: request.Test) {
  return test.buffer(true).parse((res, callback) => {
    let data = '';
    res.setEncoding('utf8');
    res.on('data', (chunk: string) => (data += chunk));
    res.on('end', () => callback(null, data));
  });
}

function parseEvents(body: string): StreamEvent[] {
  return body
    .split('\n\n')
    .filter((block) => block.startsWith('data: '))
    .map((block) => streamEventSchema.parse(JSON.parse(block.slice('data: '.length))));
}

describe('GET /api/health', () => {
  it('reports status and provider', async () => {
    const res = await request(buildApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', provider: 'mock' });
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(buildApp()).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('correlation ID', () => {
  it('generates an ID when none is sent', async () => {
    const res = await request(buildApp()).get('/api/health');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reuses a well-formed incoming ID', async () => {
    const res = await request(buildApp()).get('/api/health').set('X-Request-Id', 'abc-123');
    expect(res.headers['x-request-id']).toBe('abc-123');
  });

  it('replaces a malformed incoming ID', async () => {
    const res = await request(buildApp()).get('/api/health').set('X-Request-Id', 'bad id!<>');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('GET /api/conversations', () => {
  it('returns the seed conversations', async () => {
    const res = await request(buildApp()).get('/api/conversations');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(8);
  });
});

describe('unknown routes', () => {
  it('return a JSON 404 with the request ID', async () => {
    const res = await request(buildApp()).get('/api/nope');
    expect(res.status).toBe(404);
    const parsed = apiErrorSchema.parse(res.body);
    expect(parsed.error.code).toBe('not_found');
    expect(parsed.error.requestId).toBe(res.headers['x-request-id']);
  });
});

describe('POST /api/assist/analysis', () => {
  it('returns a validated analysis', async () => {
    const res = await request(buildApp()).post('/api/assist/analysis').send(anna);
    expect(res.status).toBe(200);
    const analysis: Analysis = analysisSchema.parse(res.body);
    expect(analysis.intent).toBe('payment_issue');
  });

  it('rejects an invalid body without echoing it back', async () => {
    const secret = 'my-card-number-4111111111111111';
    const res = await request(buildApp())
      .post('/api/assist/analysis')
      .send({ ...anna, category: secret, messages: [] });
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('invalid_request');
    expect(JSON.stringify(res.body)).not.toContain(secret);
  });

  it('rejects malformed JSON', async () => {
    const res = await request(buildApp())
      .post('/api/assist/analysis')
      .set('Content-Type', 'application/json')
      .send('{not json');
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('invalid_request');
  });

  it('rejects an oversized body', async () => {
    const res = await request(buildApp())
      .post('/api/assist/analysis')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ padding: 'x'.repeat(200_000) }));
    expect(res.status).toBe(413);
  });

  it('rejects conversations over the context budget', async () => {
    const long: Conversation = {
      ...anna,
      messages: Array.from({ length: 11 }, (_, index) => ({
        id: `m-${index}`,
        author: 'customer' as const,
        text: 'x'.repeat(2000),
        sentAt: '2026-10-06T10:00:00Z',
      })),
    };
    const res = await request(buildApp()).post('/api/assist/analysis').send(long);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/assist/suggestion', () => {
  it('streams delta events followed by done', async () => {
    const res = await readStream(request(buildApp()).post('/api/assist/suggestion').send(anna));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.headers['cache-control']).toContain('no-cache');

    const events = parseEvents(res.body as string);
    expect(events.at(-1)).toEqual({ type: 'done' });
    const text = events
      .filter((event) => event.type === 'delta')
      .map((event) => event.text)
      .join('');
    expect(text).toMatch(/^Hi Anna,/);
  });

  it('returns a regular JSON 400 for an invalid body, before streaming starts', async () => {
    const res = await request(buildApp()).post('/api/assist/suggestion').send({ nope: true });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toContain('application/json');
  });

  it('sends a generic error event when the provider fails mid-stream', async () => {
    const failing: LlmProvider = {
      name: 'failing',
      async *suggestReply() {
        yield 'Partial ';
        throw new Error('upstream secret: api key sk-ant-123');
      },
      analyze: () => Promise.reject(new Error('unused')),
    };
    const res = await readStream(
      request(buildApp({ provider: failing }))
        .post('/api/assist/suggestion')
        .send(anna),
    );

    expect(res.status).toBe(200);
    const events = parseEvents(res.body as string);
    expect(events[0]).toEqual({ type: 'delta', text: 'Partial ' });
    expect(events.at(-1)).toMatchObject({ type: 'error' });
    expect(res.body as string).not.toContain('sk-ant-123');
  });

  it('sends an error event when the stream timeout elapses', async () => {
    const slow = new MockProvider({ tokenDelayMs: 50, analysisDelayMs: 0 });
    const res = await readStream(
      request(buildApp({ provider: slow, streamTimeoutMs: 120 }))
        .post('/api/assist/suggestion')
        .send(anna),
    );
    const events = parseEvents(res.body as string);
    expect(events.at(-1)).toMatchObject({ type: 'error' });
  });
});

describe('POST /api/assist/analysis error handling', () => {
  it('returns a generic 500 and does not leak provider errors', async () => {
    const failing: LlmProvider = {
      name: 'failing',
      // eslint-disable-next-line require-yield
      async *suggestReply() {
        throw new Error('unused');
      },
      analyze: () => Promise.reject(new Error('upstream secret: api key sk-ant-123')),
    };
    const res = await request(buildApp({ provider: failing }))
      .post('/api/assist/analysis')
      .send(anna);
    expect(res.status).toBe(500);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('internal_error');
    expect(JSON.stringify(res.body)).not.toContain('sk-ant-123');
  });
});

describe('rate limiting', () => {
  it('returns 429 with a JSON body once the limit is exceeded', async () => {
    const app = buildApp({ rateLimitPerMin: 2 });
    expect((await request(app).post('/api/assist/analysis').send(anna)).status).toBe(200);
    expect((await request(app).post('/api/assist/analysis').send(anna)).status).toBe(200);

    const limited = await request(app).post('/api/assist/analysis').send(anna);
    expect(limited.status).toBe(429);
    expect(apiErrorSchema.parse(limited.body).error.code).toBe('rate_limited');
  });

  it('does not limit non-LLM endpoints', async () => {
    const app = buildApp({ rateLimitPerMin: 1 });
    for (let i = 0; i < 3; i++) {
      expect((await request(app).get('/api/conversations')).status).toBe(200);
    }
  });
});
