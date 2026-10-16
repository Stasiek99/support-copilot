import styles from './AssistPanel.module.css';

/** Shown while the lazy AssistPanel chunk loads; mirrors the panel's heading to avoid layout shift. */
export function AssistPanelFallback() {
  return (
    <div className={styles.panel} aria-busy="true">
      <h2 className={styles.heading}>Agent Assist</h2>
      <p className={styles.hint} role="status">
        Loading assistant…
      </p>
    </div>
  );
}
