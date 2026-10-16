export type LlmErrorKind = 'upstream' | 'refusal' | 'truncated' | 'invalid_output';

export class LlmError extends Error {
  constructor(
    readonly kind: LlmErrorKind,
    message: string,
    readonly upstreamStatus?: number,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}
