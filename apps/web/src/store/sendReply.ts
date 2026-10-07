import { api } from './api';
import type { AppThunk } from './store';
import { draftCleared } from './uiSlice';

/** Appends an agent message to the cached conversation and clears the draft. */
export const sendReply =
  (conversationId: string, text: string): AppThunk =>
  (dispatch) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    dispatch(
      api.util.updateQueryData('getConversations', undefined, (conversations) => {
        const conversation = conversations.find((c) => c.id === conversationId);
        if (!conversation) return;
        conversation.messages.push({
          id: `m-${conversation.messages.length + 1}`,
          author: 'agent',
          text: trimmed,
          sentAt: new Date().toISOString(),
        });
      }),
    );
    dispatch(draftCleared());
  };
