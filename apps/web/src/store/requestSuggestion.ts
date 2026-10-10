import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import { apiErrorSchema, type Conversation } from '@support-copilot/shared';
import { API_BASE_URL } from '../lib/config';
import { readStreamEvents } from '../lib/sse';
import type { AppThunk } from './store';
import {
  suggestionCompleted,
  suggestionDelta,
  suggestionFailed,
  suggestionSourcesReceived,
  suggestionStarted,
  suggestionStopped,
} from './suggestionSlice';

class SuggestionError extends Error {}

const GENERIC_ERROR = 'Could not generate a suggestion. Please try again.';

let activeController: AbortController | null = null;

export function cancelSuggestion(): void {
  activeController?.abort();
  activeController = null;
}

async function describeFailure(response: Response): Promise<string> {
  if (response.status === 429) return 'Too many requests. Please wait a moment and try again.';
  const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data.error.message : GENERIC_ERROR;
}

async function streamSuggestion(
  conversation: Conversation,
  signal: AbortSignal,
  dispatch: Dispatch<UnknownAction>,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/assist/suggestion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(conversation),
    signal,
  });
  if (!response.ok) throw new SuggestionError(await describeFailure(response));

  for await (const event of readStreamEvents(response)) {
    if (signal.aborted) return;
    switch (event.type) {
      case 'sources':
        dispatch(suggestionSourcesReceived(event.sources));
        break;
      case 'delta':
        dispatch(suggestionDelta(event.text));
        break;
      case 'done':
        dispatch(suggestionCompleted());
        return;
      case 'error':
        throw new SuggestionError(event.message);
    }
  }
  throw new SuggestionError('The suggestion stream ended unexpectedly.');
}

export const requestSuggestion =
  (conversation: Conversation): AppThunk<Promise<void>> =>
  async (dispatch) => {
    cancelSuggestion();
    const controller = new AbortController();
    activeController = controller;
    dispatch(suggestionStarted(conversation.id));

    try {
      await streamSuggestion(conversation, controller.signal, dispatch);
    } catch (error) {
      if (controller.signal.aborted) return;
      dispatch(suggestionFailed(error instanceof SuggestionError ? error.message : GENERIC_ERROR));
    } finally {
      if (activeController === controller) activeController = null;
    }
  };

export const stopSuggestion = (): AppThunk => (dispatch) => {
  cancelSuggestion();
  dispatch(suggestionStopped());
};
