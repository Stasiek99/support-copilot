import { loadConfig } from './config';

describe('loadConfig', () => {
  it('applies safe defaults', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      PORT: 3001,
      LLM_PROVIDER: 'mock',
      RATE_LIMIT_PER_MIN: 20,
      TRUST_PROXY: 0,
    });
  });

  it('coerces numeric values from strings', () => {
    expect(loadConfig({ PORT: '8080', RATE_LIMIT_PER_MIN: '5' })).toMatchObject({
      PORT: 8080,
      RATE_LIMIT_PER_MIN: 5,
    });
  });

  it('rejects an unknown provider', () => {
    expect(() => loadConfig({ LLM_PROVIDER: 'openai' })).toThrow(/LLM_PROVIDER/);
  });

  it('rejects an invalid port', () => {
    expect(() => loadConfig({ PORT: '70000' })).toThrow(/PORT/);
  });
});
