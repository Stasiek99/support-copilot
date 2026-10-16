import type { Analysis, Conversation, Source } from '@support-copilot/shared';

export interface LlmCallOptions {
  signal: AbortSignal;
}

export interface SuggestOptions extends LlmCallOptions {
  sources: readonly Source[];
}

export interface LlmProvider {
  readonly name: string;
  suggestReply(conversation: Conversation, options: SuggestOptions): AsyncIterable<string>;
  analyze(conversation: Conversation, options: LlmCallOptions): Promise<Analysis>;
}
