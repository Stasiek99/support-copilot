import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { analysisSchema, type Analysis, type Conversation } from '@support-copilot/shared';
import type { Logger } from 'pino';
import { LlmError } from './errors';
import type { LlmCallOptions, LlmProvider, SuggestOptions } from './provider';
import {
  ANALYZE_SYSTEM_PROMPT,
  buildAnalyzePrompt,
  buildSuggestPrompt,
  SUGGEST_SYSTEM_PROMPT,
} from './prompts';

export interface AnthropicProviderOptions {
  client: Anthropic;
  model: string;
  logger: Logger;
  suggestMaxTokens?: number;
  analyzeMaxTokens?: number;
}

const SUGGEST_TEMPERATURE = 0.5;
const ANALYZE_TEMPERATURE = 0;

function assertCompleted(stopReason: string | null): void {
  if (stopReason === 'refusal') throw new LlmError('refusal', 'The model declined to answer');
  if (stopReason === 'max_tokens') {
    throw new LlmError('truncated', 'The response was cut off by the token limit');
  }
  if (stopReason !== 'end_turn' && stopReason !== 'stop_sequence') {
    throw new LlmError('invalid_output', `Unexpected stop reason: ${stopReason ?? 'none'}`);
  }
}

function toLlmError(error: unknown): unknown {
  if (error instanceof LlmError || error instanceof Anthropic.APIUserAbortError) return error;
  if (error instanceof Anthropic.APIError) {
    return new LlmError(
      'upstream',
      `Anthropic API error (status ${error.status ?? 'none'})`,
      error.status,
    );
  }
  return error;
}

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly logger: Logger;
  private readonly suggestMaxTokens: number;
  private readonly analyzeMaxTokens: number;

  constructor(options: AnthropicProviderOptions) {
    this.client = options.client;
    this.model = options.model;
    this.logger = options.logger;
    this.suggestMaxTokens = options.suggestMaxTokens ?? 1024;
    this.analyzeMaxTokens = options.analyzeMaxTokens ?? 512;
  }

  async *suggestReply(
    conversation: Conversation,
    { signal, sources }: SuggestOptions,
  ): AsyncGenerator<string> {
    const stream = this.client.messages.stream(
      {
        model: this.model,
        max_tokens: this.suggestMaxTokens,
        temperature: SUGGEST_TEMPERATURE,
        system: SUGGEST_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildSuggestPrompt(conversation, sources) }],
      },
      { signal },
    );

    try {
      let produced = false;
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          produced = true;
          yield event.delta.text;
        }
      }
      const message = await stream.finalMessage();
      this.logUsage('suggest', message);
      assertCompleted(message.stop_reason);
      if (!produced) throw new LlmError('invalid_output', 'The model returned no text');
    } catch (error) {
      throw toLlmError(error);
    } finally {
      stream.abort();
    }
  }

  async analyze(conversation: Conversation, { signal }: LlmCallOptions): Promise<Analysis> {
    try {
      const message = await this.client.messages.parse(
        {
          model: this.model,
          max_tokens: this.analyzeMaxTokens,
          temperature: ANALYZE_TEMPERATURE,
          system: ANALYZE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildAnalyzePrompt(conversation) }],
          output_config: { format: zodOutputFormat(analysisSchema) },
        },
        { signal },
      );
      this.logUsage('analyze', message);
      assertCompleted(message.stop_reason);

      const result = analysisSchema.safeParse(message.parsed_output);
      if (!result.success) {
        throw new LlmError('invalid_output', 'The model output did not match the analysis schema');
      }
      return result.data;
    } catch (error) {
      throw toLlmError(error);
    }
  }

  private logUsage(
    operation: 'suggest' | 'analyze',
    message: {
      model: string;
      stop_reason: string | null;
      usage: { input_tokens: number; output_tokens: number };
    },
  ): void {
    this.logger.info(
      {
        operation,
        model: message.model,
        stopReason: message.stop_reason,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
      'llm call completed',
    );
  }
}
