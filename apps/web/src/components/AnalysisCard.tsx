import type { Conversation } from '@support-copilot/shared';
import { useId } from 'react';
import { INTENT_LABELS, SENTIMENT_LABELS } from '../lib/format';
import { useGetAnalysisQuery } from '../store/api';
import styles from './AssistPanel.module.css';

export function AnalysisCard({ conversation }: { conversation: Conversation }) {
  const headingId = useId();
  const { currentData, isFetching, isError, refetch } = useGetAnalysisQuery(conversation);

  return (
    <section className={styles.card} aria-labelledby={headingId} aria-busy={isFetching}>
      <h3 id={headingId} className={styles.cardTitle}>
        Summary
      </h3>

      {isFetching && !currentData && (
        <p className={styles.muted} role="status">
          Analyzing conversation…
        </p>
      )}

      {isError && !isFetching && (
        <div className={styles.error} role="alert">
          <p>Could not analyze this conversation.</p>
          <button type="button" className={styles.button} onClick={() => void refetch()}>
            Try again
          </button>
        </div>
      )}

      {currentData && (
        <>
          <p>{currentData.summary}</p>
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Intent</dt>
              <dd className={styles.factValue}>{INTENT_LABELS[currentData.intent]}</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Sentiment</dt>
              <dd className={styles.factValue} data-sentiment={currentData.sentiment}>
                {SENTIMENT_LABELS[currentData.sentiment]}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
