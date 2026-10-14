import { APP_NAME } from '@support-copilot/shared';
import { lazy, Suspense } from 'react';
import styles from './App.module.css';
import { AssistPanelFallback } from './components/AssistPanelFallback';
import { ConversationList } from './components/ConversationList';
import { ConversationView } from './components/ConversationView';
import { ThemeToggle } from './components/ThemeToggle';
import { INBOX_ID } from './lib/dom';

// Split out of the entry chunk: the panel is not needed for the first paint of the inbox.
const AssistPanel = lazy(() =>
  import('./components/AssistPanel').then((m) => ({ default: m.AssistPanel })),
);

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
          <Suspense fallback={<AssistPanelFallback />}>
            <AssistPanel />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
