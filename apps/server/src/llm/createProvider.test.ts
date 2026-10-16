import { pino } from 'pino';
import { loadConfig } from '../config';
import { AnthropicProvider } from './anthropicProvider';
import { createProvider } from './createProvider';
import { MockProvider } from './mockProvider';

const logger = pino({ level: 'silent' });

describe('createProvider', () => {
  it('creates the mock provider by default', () => {
    expect(createProvider(loadConfig({}), logger)).toBeInstanceOf(MockProvider);
  });

  it('creates the Anthropic provider when configured with a key', () => {
    const provider = createProvider(
      loadConfig({ LLM_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-ant-test' }),
      logger,
    );
    expect(provider).toBeInstanceOf(AnthropicProvider);
    expect(provider.name).toBe('anthropic');
  });
});
