import styles from './AssistPanel.module.css';

// Placeholder: suggested reply, summary, intent/sentiment and sources arrive in stage 3-4.
export function AssistPanel() {
  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Agent Assist</h2>
      <p className={styles.hint}>
        Suggested replies, summaries and knowledge-base sources will appear here.
      </p>
    </div>
  );
}
