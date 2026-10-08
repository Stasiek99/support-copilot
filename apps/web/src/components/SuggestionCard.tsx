import type { Conversation } from '@support-copilot/shared';
import { useEffect, useId } from 'react';
import { REPLY_FIELD_ID } from '../lib/dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { cancelSuggestion, requestSuggestion, stopSuggestion } from '../store/requestSuggestion';
import { initialSuggestionState, suggestionReset } from '../store/suggestionSlice';
import { draftChanged } from '../store/uiSlice';
import styles from './AssistPanel.module.css';

const STATUS_ANNOUNCEMENTS = {
  idle: '',
  streaming: 'Generating suggestion…',
  done: 'Suggestion ready.',
  stopped: 'Suggestion stopped.',
  error: 'Suggestion failed.',
} as const;

export function SuggestionCard({ conversation }: { conversation: Conversation }) {
  const headingId = useId();
  const dispatch = useAppDispatch();
  const stored = useAppSelector((state) => state.suggestion);
  const suggestion = stored.conversationId === conversation.id ? stored : initialSuggestionState;
  const { status, text, error } = suggestion;

  // Leaving the conversation (or the panel) must not keep a stream running in the background.
  useEffect(() => () => cancelSuggestion(), [conversation.id]);

  const accept = () => {
    dispatch(draftChanged(text));
    dispatch(suggestionReset());
    document.getElementById(REPLY_FIELD_ID)?.focus();
  };

  const hasReviewableText = (status === 'done' || status === 'stopped') && text.length > 0;

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.cardTitle}>
        Suggested reply
      </h3>

      {/* Streamed text is not a live region (it would be read token by token); status is. */}
      <p className="visually-hidden" role="status">
        {STATUS_ANNOUNCEMENTS[status]}
      </p>

      {status === 'idle' && (
        <p className={styles.muted}>Generate a draft reply based on this conversation.</p>
      )}

      {text.length > 0 && (
        <p
          className={`${styles.suggestion} ${status === 'streaming' ? styles.cursor : ''}`}
          aria-busy={status === 'streaming'}
        >
          {text}
        </p>
      )}

      {status === 'error' && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        {status === 'streaming' ? (
          <button
            type="button"
            className={styles.button}
            onClick={() => dispatch(stopSuggestion())}
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.button} ${hasReviewableText ? '' : styles.primary}`}
            onClick={() => void dispatch(requestSuggestion(conversation))}
          >
            {status === 'idle' ? 'Suggest reply' : 'Regenerate'}
          </button>
        )}
        {hasReviewableText && (
          <>
            <button type="button" className={`${styles.button} ${styles.primary}`} onClick={accept}>
              Use this reply
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => dispatch(suggestionReset())}
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </section>
  );
}
