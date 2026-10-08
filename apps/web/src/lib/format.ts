import type { Category, Intent, Sentiment } from '@support-copilot/shared';

export const CATEGORY_LABELS: Record<Category, string> = {
  payments: 'Payments',
  delivery: 'Delivery',
  returns: 'Returns',
  account: 'Account',
};

export const INTENT_LABELS: Record<Intent, string> = {
  payment_issue: 'Payment issue',
  delivery_status: 'Delivery status',
  return_request: 'Return request',
  account_access: 'Account access',
  other: 'Other',
};

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  negative: 'Negative',
  neutral: 'Neutral',
  positive: 'Positive',
};

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatTimestamp(iso: string): string {
  return timeFormatter.format(new Date(iso));
}
