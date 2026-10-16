import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pino } from 'pino';
import request from 'supertest';
import { createApp } from './app';
import { MockProvider } from './llm/mockProvider';
import { createKnowledgeBase } from './rag/knowledgeBase';

const INDEX_HTML = '<!doctype html><title>Support Copilot</title><div id="root"></div>';

let staticDir: string;

beforeAll(async () => {
  staticDir = await mkdtemp(path.join(tmpdir(), 'support-copilot-static-'));
  await mkdir(path.join(staticDir, 'assets'));
  await writeFile(path.join(staticDir, 'index.html'), INDEX_HTML);
  await writeFile(path.join(staticDir, 'theme-init.js'), 'document.documentElement.dataset.x=1;');
  await writeFile(path.join(staticDir, 'assets', 'index-abc123.js'), 'export default 1;');
});

afterAll(async () => {
  await rm(staticDir, { recursive: true, force: true });
});

function buildApp(options: { staticDir?: string } = {}) {
  return createApp({
    provider: new MockProvider({ tokenDelayMs: 0, analysisDelayMs: 0 }),
    knowledge: createKnowledgeBase([]),
    logger: pino({ level: 'silent' }),
    rateLimitPerMin: 1000,
    streamTimeoutMs: 5000,
    trustProxy: 0,
    ...options,
  });
}

describe('static web app', () => {
  it('is not served unless a static directory is configured', async () => {
    const res = await request(buildApp()).get('/');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('serves index.html at the root and revalidates it on every load', async () => {
    const res = await request(buildApp({ staticDir })).get('/');

    expect(res.status).toBe(200);
    expect(res.type).toBe('text/html');
    expect(res.text).toBe(INDEX_HTML);
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('caches fingerprinted assets forever', async () => {
    const res = await request(buildApp({ staticDir })).get('/assets/index-abc123.js');

    expect(res.status).toBe(200);
    expect(res.type).toBe('text/javascript');
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('revalidates unfingerprinted files such as the theme bootstrap script', async () => {
    const res = await request(buildApp({ staticDir })).get('/theme-init.js');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('falls back to index.html for client-side routes', async () => {
    const res = await request(buildApp({ staticDir })).get('/conversations/c-1001');

    expect(res.status).toBe(200);
    expect(res.text).toBe(INDEX_HTML);
  });

  it('does not turn a missing file into index.html', async () => {
    const app = buildApp({ staticDir });

    expect((await request(app).get('/assets/index-old999.js')).status).toBe(404);
    expect((await request(app).get('/favicon.ico')).status).toBe(404);
  });

  it('keeps unknown API paths as JSON 404s', async () => {
    const app = buildApp({ staticDir });

    for (const url of ['/api', '/api/nope', '/api/assist/nope']) {
      const res = await request(app).get(url);
      expect(res.status, url).toBe(404);
      expect(res.type, url).toBe('application/json');
      expect(res.body.error.code, url).toBe('not_found');
    }
  });

  it('does not answer other methods with the page', async () => {
    const res = await request(buildApp({ staticDir })).post('/somewhere').send({});

    expect(res.status).toBe(404);
    expect(res.type).toBe('application/json');
  });

  it('does not serve files outside the static directory', async () => {
    const res = await request(buildApp({ staticDir })).get('/..%2f..%2fpackage.json');

    expect(res.status).not.toBe(200);
    expect(res.text).not.toContain('"name"');
  });

  it('keeps the API and its security headers working next to the pages', async () => {
    const app = buildApp({ staticDir });

    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok', provider: 'mock' });

    const page = await request(app).get('/');
    expect(page.headers['x-content-type-options']).toBe('nosniff');
    expect(page.headers['content-security-policy']).toContain("script-src 'self'");
  });
});
