import type { StreamEvent } from '@support-copilot/shared';
import { readStreamEvents } from './sse';

const encoder = new TextEncoder();

function responseFromChunks(chunks: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream);
}

async function collect(response: Response): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const event of readStreamEvents(response)) events.push(event);
  return events;
}

describe('readStreamEvents', () => {
  it('parses consecutive events', async () => {
    const events = await collect(
      responseFromChunks(['data: {"type":"delta","text":"Hi"}\n\ndata: {"type":"done"}\n\n']),
    );
    expect(events).toEqual([{ type: 'delta', text: 'Hi' }, { type: 'done' }]);
  });

  it('reassembles an event split across chunks', async () => {
    const events = await collect(
      responseFromChunks(['data: {"type":"del', 'ta","text":"Hel', 'lo"}\n', '\n']),
    );
    expect(events).toEqual([{ type: 'delta', text: 'Hello' }]);
  });

  it('handles CRLF line endings', async () => {
    const events = await collect(responseFromChunks(['data: {"type":"done"}\r\n\r\n']));
    expect(events).toEqual([{ type: 'done' }]);
  });

  it('keeps multibyte characters split across chunks intact', async () => {
    const bytes = encoder.encode('data: {"type":"delta","text":"Wiśniewski"}\n\n');
    const split = bytes.indexOf(0xc5) + 1; // between the two bytes of "ś"
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, split));
        controller.enqueue(bytes.slice(split));
        controller.close();
      },
    });
    const events = await collect(new Response(stream));
    expect(events).toEqual([{ type: 'delta', text: 'Wiśniewski' }]);
  });

  it('ignores comments and keep-alive blocks', async () => {
    const events = await collect(responseFromChunks([': keep-alive\n\ndata: {"type":"done"}\n\n']));
    expect(events).toEqual([{ type: 'done' }]);
  });

  it('ignores an incomplete trailing event', async () => {
    const events = await collect(
      responseFromChunks(['data: {"type":"done"}\n\ndata: {"type":"del']),
    );
    expect(events).toEqual([{ type: 'done' }]);
  });

  it('throws on invalid JSON', async () => {
    await expect(collect(responseFromChunks(['data: {nope\n\n']))).rejects.toThrow();
  });

  it('throws on events that fail schema validation', async () => {
    await expect(collect(responseFromChunks(['data: {"type":"explode"}\n\n']))).rejects.toThrow();
  });

  it('throws when the response has no body', async () => {
    await expect(collect(new Response(null))).rejects.toThrow('no body');
  });
});
