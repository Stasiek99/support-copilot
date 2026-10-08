import type { Config } from '../config';
import { MockProvider } from './mockProvider';
import type { LlmProvider } from './provider';

export function createProvider(config: Config): LlmProvider {
  switch (config.LLM_PROVIDER) {
    case 'mock':
      return new MockProvider({
        tokenDelayMs: config.MOCK_TOKEN_DELAY_MS,
        analysisDelayMs: config.MOCK_ANALYSIS_DELAY_MS,
      });
    case 'anthropic':
      // Implemented in stage 4; fail fast instead of silently falling back to the mock.
      throw new Error('LLM_PROVIDER=anthropic is not implemented yet');
  }
}
