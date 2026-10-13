import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryState {
  failed: boolean;
}

/** Last line of defence: a render crash shows a recoverable message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log the error type and component stack only; messages may embed customer content.
    console.error('Unhandled render error', {
      name: error.name,
      componentStack: info.componentStack,
    });
  }

  override render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className={styles.fallback} role="alert">
        <h1 className={styles.title}>Something went wrong</h1>
        <p>The app hit an unexpected error. Reloading usually fixes it.</p>
        <button type="button" className={styles.button} onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
  }
}
