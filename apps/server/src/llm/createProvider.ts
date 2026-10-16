import Anthropic from '@anthropic-ai/sdk';
import type { Logger } from 'pino';
import type { Config } from '../config';
import { AnthropicProvider } from './anthropicProvider';
import { MockProvider } from './mockProvider';
import type { LlmProvider } from './provider';

export function createProvider(config: Config, logger: Logger): LlmProvider {
  switch (config.LLM_PROVIDER) {
    case 'mock':
      return new MockProvider({
        tokenDelayMs: config.MOCK_TOKEN_DELAY_MS,
        analysisDelayMs: config.MOCK_ANALYSIS_DELAY_MS,
      });
    case 'anthropic':
      return new AnthropicProvider({
        client: new Anthropic({
          apiKey: config.ANTHROPIC_API_KEY,
          timeout: config.STREAM_TIMEOUT_MS,
          maxRetries: 1,
        }),
        model: config.ANTHROPIC_MODEL,
        logger,
      });
  }
}
