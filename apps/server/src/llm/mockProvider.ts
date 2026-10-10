import { setTimeout as sleep } from 'node:timers/promises';
import { analysisSchema, type Analysis, type Conversation } from '@support-copilot/shared';
import { analysisFor, suggestionFor } from './mockFixtures';
import type { LlmCallOptions, LlmProvider, SuggestOptions } from './provider';

export interface MockProviderOptions {
  tokenDelayMs?: number;
  analysisDelayMs?: number;
}

export class MockProvider implements LlmProvider {
  readonly name = 'mock';
  private readonly tokenDelayMs: number;
  private readonly analysisDelayMs: number;

  constructor(options: MockProviderOptions = {}) {
    this.tokenDelayMs = options.tokenDelayMs ?? 25;
    this.analysisDelayMs = options.analysisDelayMs ?? 400;
  }

  async *suggestReply(
    conversation: Conversation,
    { signal }: SuggestOptions,
  ): AsyncGenerator<string> {
    for (const chunk of suggestionFor(conversation).match(/\S+\s*/g) ?? []) {
      await pause(this.tokenDelayMs, signal);
      yield chunk;
    }
  }

  async analyze(conversation: Conversation, { signal }: LlmCallOptions): Promise<Analysis> {
    await pause(this.analysisDelayMs, signal);
    return analysisSchema.parse(analysisFor(conversation));
  }
}

async function pause(ms: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  if (ms > 0) await sleep(ms, undefined, { signal });
}
