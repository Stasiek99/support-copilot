import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { App } from '../App';
import { renderWithStore } from '../test/renderWithStore';
import {
  analysisUrl,
  sseEvents,
  sseResponse,
  suggestionUrl,
  testAnalysis,
  testSource,
} from '../test/handlers';
import { server } from '../test/server';

async function openConversation(name: RegExp) {
  renderWithStore(<App />);
  await userEvent.click(await screen.findByRole('button', { name }));
}

describe('AssistPanel', () => {
  it('prompts to select a conversation first', () => {
    renderWithStore(<App />);
    expect(screen.getByText(/Select a conversation to get a summary/)).toBeInTheDocument();
  });

  describe('analysis', () => {
    it('shows the summary, intent and sentiment for the selected conversation', async () => {
      await openConversation(/Anna Kowalska/);

      expect(await screen.findByText(testAnalysis.summary)).toBeInTheDocument();
      expect(screen.getByText('Payment issue')).toBeInTheDocument();
      expect(screen.getByText('Negative')).toBeInTheDocument();
    });

    it('shows a loading state while the analysis is pending', async () => {
      server.use(http.post(analysisUrl, () => new Promise(() => undefined)));
      await openConversation(/Anna Kowalska/);

      expect(await screen.findByText('Analyzing conversation…')).toBeInTheDocument();
    });

    it('shows an error with a working retry', async () => {
      let calls = 0;
      server.use(
        http.post(analysisUrl, () => {
          calls += 1;
          return calls === 1
            ? HttpResponse.json(
                { error: { code: 'internal_error', message: 'x' } },
                { status: 500 },
              )
            : HttpResponse.json(testAnalysis);
        }),
      );
      await openConversation(/Anna Kowalska/);

      const alert = await screen.findByRole('alert');
      expect(within(alert).getByText('Could not analyze this conversation.')).toBeInTheDocument();

      await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
      expect(await screen.findByText(testAnalysis.summary)).toBeInTheDocument();
    });
  });

  describe('suggested reply', () => {
    it('streams a suggestion and announces completion', async () => {
      await openConversation(/Anna Kowalska/);

      await userEvent.click(screen.getByRole('button', { name: 'Suggest reply' }));

      expect(await screen.findByText('Hello there, happy to help.')).toBeInTheDocument();
      expect(screen.getByText('Suggestion ready.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
    });

    it('shows the knowledge-base sources the suggestion is based on', async () => {
      await openConversation(/Anna Kowalska/);
      expect(screen.queryByRole('list', { name: 'Knowledge base sources' })).toBeNull();

      await userEvent.click(screen.getByRole('button', { name: 'Suggest reply' }));

      const list = await screen.findByRole('list', { name: 'Knowledge base sources' });
      expect(within(list).getByText(testSource.title)).toBeInTheDocument();
      expect(within(list).getByText(testSource.text)).toBeInTheDocument();
    });

    it('shows no sources section when retrieval found nothing', async () => {
      server.use(
        http.post(suggestionUrl, () =>
          sseResponse(
            sseEvents([
              { type: 'sources', sources: [] },
              { type: 'delta', text: 'Plain reply.' },
              { type: 'done' },
            ]),
          ),
        ),
      );
      await openConversation(/Anna Kowalska/);
      await userEvent.click(screen.getByRole('button', { name: 'Suggest reply' }));

      expect(await screen.findByText('Plain reply.')).toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Knowledge base sources' })).toBeNull();
    });

    it('moves the accepted suggestion into the reply field and focuses it', async () => {
      await openConversation(/Anna Kowalska/);
      await userEvent.click(screen.getByRole('button', { name: 'Suggest reply' }));
      await userEvent.click(await screen.findByRole('button', { name: 'Use this reply' }));

      const reply = screen.getByRole('textbox', { name: 'Reply' });
      expect(reply).toHaveValue('Hello there, happy to help.');
      expect(reply).toHaveFocus();
      expect(screen.getByRole('button', { name: 'Suggest reply' })).toBeInTheDocument();
    });

    it('dismisses a suggestion without touching the reply field', async () => {
      await openConversation(/Anna Kowalska/);
      await userEvent.click(screen.getByRole('button', { name: 'Suggest reply' }));
      await userEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));

      expect(screen.queryByText('Hello there, happy to help.')).toBeNull();
      expect(screen.getByRole('textbox', { name: 'Reply' })).toHaveValue('');
    });

    it('lets the agent stop a running stream and keep the partial text', async () => {
      const encoder = new TextEncoder();
      server.use(
        http.post(suggestionUrl, () => {
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                encoder.encode('data: {"type":"delta","text":"Partial reply"}\n\n'),
              );
            },
          });
          return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
        }),
      );
      await openConversation(/Anna Kowalska/);

      await userEvent.click(screen.getByRole('button', { name: 'Suggest reply' }));
      expect(await screen.findByText('Partial reply')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
      expect(screen.getByText('Suggestion stopped.')).toBeInTheDocument();
      expect(screen.getByText('Partial reply')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Use this reply' })).toBeInTheDocument();
    });

    it('shows the error from an SSE error event', async () => {
      server.use(
        http.post(suggestionUrl, () =>
          sseResponse(
            sseEvents([
              { type: 'delta', text: 'Start ' },
              { type: 'error', message: 'Could not generate a suggestion. Please try again.' },
            ]),
          ),
        ),
      );
      await openConversation(/Anna Kowalska/);
      await userEvent.click(screen.getByRole('button', { name: 'Suggest reply' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Could not generate a suggestion. Please try again.',
      );
      expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
    });

    it('shows a friendly message when rate limited', async () => {
      server.use(
        http.post(suggestionUrl, () =>
          HttpResponse.json(
            { error: { code: 'rate_limited', message: 'Too many requests, slow down' } },
            { status: 429 },
          ),
        ),
      );
      await openConversation(/Anna Kowalska/);
      await userEvent.click(screen.getByRole('button', { name: 'Suggest reply' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/Too many requests/);
    });

    it('reports a stream that ends without a done event', async () => {
      server.use(
        http.post(suggestionUrl, () =>
          sseResponse(sseEvents([{ type: 'delta', text: 'Cut off' }])),
        ),
      );
      await openConversation(/Anna Kowalska/);
      await userEvent.click(screen.getByRole('button', { name: 'Suggest reply' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/ended unexpectedly/);
    });

    it('clears the suggestion when another conversation is selected', async () => {
      await openConversation(/Anna Kowalska/);
      await userEvent.click(screen.getByRole('button', { name: 'Suggest reply' }));
      await screen.findByText('Hello there, happy to help.');

      await userEvent.click(screen.getByRole('button', { name: /Sofia Rossi/ }));

      await waitFor(() => expect(screen.queryByText('Hello there, happy to help.')).toBeNull());
      expect(screen.getByRole('button', { name: 'Suggest reply' })).toBeInTheDocument();
    });
  });
});
