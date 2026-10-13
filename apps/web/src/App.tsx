import { APP_NAME } from '@support-copilot/shared';
import styles from './App.module.css';
import { AssistPanel } from './components/AssistPanel';
import { ConversationList } from './components/ConversationList';
import { ConversationView } from './components/ConversationView';
import { ThemeToggle } from './components/ThemeToggle';
import { INBOX_ID } from './lib/dom';

export function App() {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href={`#${INBOX_ID}`}>
        Skip to conversations
      </a>
      <header className={styles.header}>
        <h1 className={styles.title}>{APP_NAME}</h1>
        <ThemeToggle />
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
