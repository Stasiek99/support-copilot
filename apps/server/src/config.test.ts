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

  it('requires an API key for the Anthropic provider', () => {
    expect(() => loadConfig({ LLM_PROVIDER: 'anthropic' })).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('treats an empty API key as missing', () => {
    expect(() => loadConfig({ LLM_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: '' })).toThrow(
      /ANTHROPIC_API_KEY/,
    );
  });

  it('does not need an API key for the mock provider', () => {
    expect(loadConfig({ LLM_PROVIDER: 'mock', ANTHROPIC_API_KEY: '' }).ANTHROPIC_API_KEY).toBe(
      undefined,
    );
  });

  it('defaults to the Haiku 4.5 model listed for structured outputs', () => {
    expect(loadConfig({}).ANTHROPIC_MODEL).toBe('claude-haiku-4-5-20251001');
  });
});
