import { MAX_MESSAGE_LENGTH } from '@support-copilot/shared';
import type { FormEvent } from 'react';
import { formatTimestamp } from '../lib/format';
import { useGetConversationsQuery } from '../store/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { sendReply } from '../store/sendReply';
import { draftChanged } from '../store/uiSlice';
import styles from './ConversationView.module.css';

export function ConversationView() {
  const selectedId = useAppSelector((state) => state.ui.selectedConversationId);
  const draft = useAppSelector((state) => state.ui.draftReply);
  const dispatch = useAppDispatch();
  const { conversation } = useGetConversationsQuery(undefined, {
    selectFromResult: ({ data }) => ({ conversation: data?.find((c) => c.id === selectedId) }),
  });

  if (!conversation) {
    return (
      <div className={styles.empty}>
        <h2 className={styles.emptyTitle}>No conversation selected</h2>
        <p>Pick a conversation from the inbox to see the messages.</p>
      </div>
    );
  }

  const canSend = draft.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSend) dispatch(sendReply(conversation.id, draft));
  };

  return (
    <section className={styles.view} aria-label={`Conversation with ${conversation.customerName}`}>
      <header className={styles.header}>
        <h2 className={styles.customer}>{conversation.customerName}</h2>
        <p className={styles.subject}>{conversation.subject}</p>
      </header>

      <ol className={styles.messages} aria-label="Messages">
        {conversation.messages.map((message) => (
          <li key={message.id} className={styles.message} data-author={message.author}>
            <p className={styles.bubble}>
              <span className="visually-hidden">
                {message.author === 'customer' ? 'Customer: ' : 'Agent: '}
              </span>
              {message.text}
            </p>
            <time className={styles.meta} dateTime={message.sentAt}>
              {formatTimestamp(message.sentAt)}
            </time>
          </li>
        ))}
      </ol>

      <form className={styles.composer} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="reply">
          Reply
        </label>
        <textarea
          id="reply"
          className={styles.textarea}
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(event) => dispatch(draftChanged(event.target.value))}
        />
        <div className={styles.actions}>
          <span className={styles.counter}>
            {draft.length}/{MAX_MESSAGE_LENGTH}
          </span>
          <button type="submit" className={styles.send} disabled={!canSend}>
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
