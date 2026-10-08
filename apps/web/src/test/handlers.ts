import { seedConversations, type Analysis, type StreamEvent } from '@support-copilot/shared';
import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '../lib/config';

export const analysisUrl = `${API_BASE_URL}/assist/analysis`;
export const suggestionUrl = `${API_BASE_URL}/assist/suggestion`;

export const testAnalysis: Analysis = {
  summary: 'The customer was charged but the order failed.',
  intent: 'payment_issue',
  sentiment: 'negative',
};

const encoder = new TextEncoder();

/** Builds an SSE response. Each string is written as its own network chunk. */
export function sseResponse(chunks: string[], status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

export function sseEvents(events: StreamEvent[]): string[] {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`);
}

export const handlers = [
  http.get(`${API_BASE_URL}/conversations`, () => HttpResponse.json(seedConversations)),
  http.post(analysisUrl, () => HttpResponse.json(testAnalysis)),
  http.post(suggestionUrl, () =>
    sseResponse(
      sseEvents([
        { type: 'delta', text: 'Hello ' },
        { type: 'delta', text: 'there, ' },
        { type: 'delta', text: 'happy to help.' },
        { type: 'done' },
      ]),
    ),
  ),
];
