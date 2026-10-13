import { seedConversations } from '@support-copilot/shared';
import { http } from 'msw';
import { STREAM_STALL_TIMEOUT_MS } from '../lib/config';
import { STALLED_MESSAGE } from '../lib/errors';
import { suggestionUrl } from '../test/handlers';
import { server } from '../test/server';
import { requestSuggestion, stopSuggestion } from './requestSuggestion';
import { setupStore } from './store';

const encoder = new TextEncoder();

/** Emits one delta and then goes silent without ever closing, like a dropped connection. */
function silentStream(): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"type":"delta","text":"Partial "}\n\n'));
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
}

describe('requestSuggestion watchdog', () => {
  const conversation = seedConversations[0]!;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    server.use(http.post(suggestionUrl, silentStream));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fails a stream that goes silent and keeps the partial text', async () => {
    const store = setupStore();
    void store.dispatch(requestSuggestion(conversation));

    await vi.advanceTimersByTimeAsync(STREAM_STALL_TIMEOUT_MS - 1);
    expect(store.getState().suggestion.status).toBe('streaming');

    await vi.advanceTimersByTimeAsync(1);
    await vi.waitFor(() => expect(store.getState().suggestion.status).toBe('error'));
    expect(store.getState().suggestion.error).toBe(STALLED_MESSAGE);
    expect(store.getState().suggestion.text).toBe('Partial ');
  });

  it('does not report a stall after the agent stopped the stream', async () => {
    const store = setupStore();
    void store.dispatch(requestSuggestion(conversation));
    await vi.advanceTimersByTimeAsync(10);

    store.dispatch(stopSuggestion());
    await vi.advanceTimersByTimeAsync(STREAM_STALL_TIMEOUT_MS * 2);

    expect(store.getState().suggestion.status).toBe('stopped');
    expect(store.getState().suggestion.error).toBeNull();
  });
});
