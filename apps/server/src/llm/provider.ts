import type { Analysis, Conversation } from '@support-copilot/shared';

export interface LlmCallOptions {
  /** Aborted when the client disconnects or the request times out. */
  signal: AbortSignal;
}

/** Provider-agnostic LLM boundary. Implementations: MockProvider, AnthropicProvider (stage 4). */
export interface LlmProvider {
  readonly name: string;
  /** Streams a suggested agent reply as text chunks. */
  suggestReply(conversation: Conversation, options: LlmCallOptions): AsyncIterable<string>;
  /** Returns a structured analysis. Callers still validate the result. */
  analyze(conversation: Conversation, options: LlmCallOptions): Promise<Analysis>;
}
