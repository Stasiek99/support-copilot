import { streamEventSchema, type StreamEvent } from '@support-copilot/shared';

function parseBlock(block: string): StreamEvent | null {
  const data = block
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trimStart())
    .join('\n');
  // Blocks without data lines are comments/keep-alives.
  if (!data) return null;
  return streamEventSchema.parse(JSON.parse(data));
}

/**
 * Reads a Server-Sent Events response body and yields validated events.
 * Handles events split across network chunks and CRLF line endings. Cancels the
 * underlying stream when the consumer stops iterating.
 */
export async function* readStreamEvents(response: Response): AsyncGenerator<StreamEvent> {
  if (!response.body) throw new Error('Response has no body');

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value.replaceAll('\r\n', '\n');

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const event = parseBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (event) yield event;
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
