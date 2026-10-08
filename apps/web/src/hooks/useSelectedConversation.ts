import { useGetConversationsQuery } from '../store/api';
import { useAppSelector } from '../store/hooks';

export function useSelectedConversation() {
  const selectedId = useAppSelector((state) => state.ui.selectedConversationId);
  const { conversation } = useGetConversationsQuery(undefined, {
    selectFromResult: ({ data }) => ({ conversation: data?.find((c) => c.id === selectedId) }),
  });
  return conversation;
}
