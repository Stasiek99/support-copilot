import AxeBuilder from '@axe-core/playwright';
import { expect, test as base, type Page } from '@playwright/test';

export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export const test = base.extend<{ makeAxeBuilder: () => AxeBuilder }>({
  makeAxeBuilder: async ({ page }, use) => {
    await use(() => new AxeBuilder({ page }).withTags(WCAG_TAGS));
  },
});

export { expect };

export async function openConversation(page: Page, customerName: string): Promise<void> {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Conversations' })
    .getByRole('button', { name: new RegExp(customerName) })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: customerName })).toBeVisible();
}

export async function requestSuggestion(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Suggest reply' }).click();
  await expect(page.getByText('Suggestion ready.')).toBeAttached();
}
