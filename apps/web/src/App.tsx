import { APP_NAME } from '@support-copilot/shared';
import styles from './App.module.css';
import { AssistPanel } from './components/AssistPanel';
import { ConversationList } from './components/ConversationList';
import { ConversationView } from './components/ConversationView';

export function App() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>{APP_NAME}</h1>
      </header>
      <div className={styles.layout}>
        <div className={styles.column}>
          <ConversationList />
        </div>
        <main className={styles.column}>
          <ConversationView />
        </main>
        <aside className={`${styles.column} ${styles.assist}`} aria-label="Agent assist">
          <AssistPanel />
        </aside>
      </div>
    </div>
  );
}
