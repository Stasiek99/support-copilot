import { useSelectedConversation } from '../hooks/useSelectedConversation';
import { AnalysisCard } from './AnalysisCard';
import styles from './AssistPanel.module.css';
import { SuggestionCard } from './SuggestionCard';

export function AssistPanel() {
  const conversation = useSelectedConversation();

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Agent Assist</h2>
      {conversation ? (
        <>
          <AnalysisCard conversation={conversation} />
          <SuggestionCard conversation={conversation} />
        </>
      ) : (
        <p className={styles.hint}>Select a conversation to get a summary and a suggested reply.</p>
      )}
    </div>
  );
}
