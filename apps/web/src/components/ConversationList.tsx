import { useMemo } from 'react';
import { CATEGORY_LABELS, formatTimestamp } from '../lib/format';
import { useGetConversationsQuery } from '../store/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { conversationSelected } from '../store/uiSlice';
import styles from './ConversationList.module.css';

export function ConversationList() {
  const { data, isLoading, isError, refetch } = useGetConversationsQuery();
  const selectedId = useAppSelector((state) => state.ui.selectedConversationId);
  const dispatch = useAppDispatch();

  const sorted = useMemo(
    () => data?.toSorted((a, b) => lastSentAt(b).localeCompare(lastSentAt(a))) ?? [],
    [data],
  );

  return (
    <nav aria-label="Conversations">
      <h2 className={styles.heading}>Inbox</h2>
      {isLoading && (
        <p className={styles.status} role="status">
          Loading conversations…
        </p>
      )}
      {isError && (
        <div className={styles.error} role="alert">
          <p>Could not load conversations.</p>
          <button type="button" className={styles.retry} onClick={() => void refetch()}>
            Try again
          </button>
        </div>
      )}
      <ul>
        {sorted.map((conversation) => {
          const last = conversation.messages[conversation.messages.length - 1];
          const isSelected = conversation.id === selectedId;
          return (
            <li key={conversation.id}>
              <button
                type="button"
                className={styles.item}
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => dispatch(conversationSelected(conversation.id))}
              >
                <span className={styles.row}>
                  <span className={styles.name}>{conversation.customerName}</span>
                  {last && (
                    <time className={styles.time} dateTime={last.sentAt}>
                      {formatTimestamp(last.sentAt)}
                    </time>
                  )}
                </span>
                <span className={styles.subject}>{conversation.subject}</span>
                {last && <span className={styles.snippet}>{last.text}</span>}
                <span className={styles.badge} data-category={conversation.category}>
                  {CATEGORY_LABELS[conversation.category]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function lastSentAt(conversation: { messages: { sentAt: string }[] }): string {
  return conversation.messages[conversation.messages.length - 1]?.sentAt ?? '';
}
