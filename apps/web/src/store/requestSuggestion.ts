import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import { apiErrorSchema, type Conversation } from '@support-copilot/shared';
import { API_BASE_URL, STREAM_STALL_TIMEOUT_MS } from '../lib/config';
import { OFFLINE_MESSAGE, RATE_LIMITED_MESSAGE, STALLED_MESSAGE } from '../lib/errors';
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
  if (response.status === 429) return RATE_LIMITED_MESSAGE;
  const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data.error.message : GENERIC_ERROR;
}

async function streamSuggestion(
  conversation: Conversation,
  signal: AbortSignal,
  dispatch: Dispatch<UnknownAction>,
  onActivity: () => void,
): Promise<void> {
  onActivity();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/assist/suggestion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(conversation),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new SuggestionError(OFFLINE_MESSAGE);
  }
  if (!response.ok) throw new SuggestionError(await describeFailure(response));

  for await (const event of readStreamEvents(response)) {
    if (signal.aborted) return;
    onActivity();
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

    // Aborts a stream that goes silent (e.g. a dropped connection that never errors).
    let stalled = false;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const armWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        if (activeController !== controller) return;
        stalled = true;
        controller.abort();
        // Report directly: an aborted body read is not guaranteed to reject in every runtime.
        dispatch(suggestionFailed(STALLED_MESSAGE));
      }, STREAM_STALL_TIMEOUT_MS);
    };

    try {
      await streamSuggestion(conversation, controller.signal, dispatch, armWatchdog);
    } catch (error) {
      // Stalled (already reported), superseded by a newer request, stopped by the agent,
      // or unmounted: nothing more to report.
      if (stalled || activeController !== controller) return;
      dispatch(suggestionFailed(error instanceof SuggestionError ? error.message : GENERIC_ERROR));
    } finally {
      clearTimeout(watchdog);
      if (activeController === controller) activeController = null;
    }
  };

export const stopSuggestion = (): AppThunk => (dispatch) => {
  cancelSuggestion();
  dispatch(suggestionStopped());
};
