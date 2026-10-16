import { expect, openConversation, test } from './fixtures';

test.describe('inbox', () => {
  test('lists the seed conversations, newest first', async ({ page }) => {
    await page.goto('/');

    const items = page.getByRole('navigation', { name: 'Conversations' }).getByRole('listitem');
    await expect(items).toHaveCount(8);
    await expect(items.first()).toContainText('Jakub');
    await expect(items.last()).toContainText('Emma');
    await expect(page.getByRole('heading', { name: 'No conversation selected' })).toBeVisible();
  });

  test('opening a conversation shows the thread and its analysis', async ({ page }) => {
    await openConversation(page, 'Anna Kowalska');

    const messages = page.getByRole('list', { name: 'Messages' });
    await expect(messages.getByRole('listitem')).toHaveCount(3);
    await expect(page.getByRole('button', { name: /Anna Kowalska/ })).toHaveAttribute(
      'aria-current',
      'true',
    );

    await expect(page.getByText(/order #48213 was declined/)).toBeVisible();
    await expect(page.getByText('Payment issue')).toBeVisible();
    await expect(page.getByText('Negative')).toBeVisible();
  });

  test('switching conversations replaces the thread and the analysis', async ({ page }) => {
    await openConversation(page, 'Anna Kowalska');
    await expect(page.getByText('Payment issue')).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Conversations' })
      .getByRole('button', { name: /Sofia Rossi/ })
      .click();

    await expect(page.getByRole('heading', { level: 2, name: 'Sofia Rossi' })).toBeVisible();
    await expect(page.getByText('Delivery status')).toBeVisible();
    await expect(page.getByText('Payment issue')).toHaveCount(0);
  });
});
