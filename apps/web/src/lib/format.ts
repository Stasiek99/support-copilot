import type { Category } from '@support-copilot/shared';

export const CATEGORY_LABELS: Record<Category, string> = {
  payments: 'Payments',
  delivery: 'Delivery',
  returns: 'Returns',
  account: 'Account',
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
