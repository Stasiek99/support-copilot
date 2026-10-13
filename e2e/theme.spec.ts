import { expect, openConversation, requestSuggestion, test } from './fixtures';

const root = (page: import('@playwright/test').Page) => page.locator('html');

test.describe('dark mode', () => {
  test.describe('follows the OS preference', () => {
    test.use({ colorScheme: 'dark' });

    test('renders the dark palette and passes axe', async ({ page, makeAxeBuilder }) => {
      await openConversation(page, 'Anna Kowalska');
      await requestSuggestion(page);
      await expect(page.getByRole('list', { name: 'Knowledge base sources' })).toBeVisible();

      await expect(root(page)).not.toHaveAttribute('data-theme', /.+/);
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
        'rgb(13, 17, 23)',
      );
      expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
    });

    test('error state passes axe', async ({ page, makeAxeBuilder }) => {
      await openConversation(page, 'Anna Kowalska');
      await page.route('**/api/assist/suggestion', (route) => route.abort());
      await page.getByRole('button', { name: 'Suggest reply' }).click();
      await expect(page.getByRole('alert')).toBeVisible();

      expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
    });

    test('an explicit Light choice beats the OS preference', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('radio', { name: 'Light' }).check();

      await expect(root(page)).toHaveAttribute('data-theme', 'light');
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
        'rgb(244, 246, 250)',
      );
    });
  });

  test.describe('explicit choice', () => {
    test.use({ colorScheme: 'light' });

    test('Dark persists across reloads without a flash of the light palette', async ({
      page,
      makeAxeBuilder,
    }) => {
      await page.goto('/');
      await page.getByRole('radio', { name: 'Dark' }).check();
      await expect(root(page)).toHaveAttribute('data-theme', 'dark');
      expect((await makeAxeBuilder().analyze()).violations).toEqual([]);

      await page.reload();
      await expect(root(page)).toHaveAttribute('data-theme', 'dark');
      await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
    });

    test('can be changed from the keyboard', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('radio', { name: 'System' }).focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');

      await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
      await expect(root(page)).toHaveAttribute('data-theme', 'dark');
    });
  });
});
