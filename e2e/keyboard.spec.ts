import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

async function tabUntil(page: Page, accessibleName: string, maxPresses = 30): Promise<void> {
  for (let press = 0; press < maxPresses; press++) {
    await page.keyboard.press('Tab');
    const matches = await page.evaluate(
      (name) => (document.activeElement?.textContent ?? '').trim() === name,
      accessibleName,
    );
    if (matches) return;
  }
  throw new Error(`Never reached "${accessibleName}" with the keyboard`);
}

async function openInbox(page: Page): Promise<void> {
  await page.goto('/');
  await expect(
    page.getByRole('navigation', { name: 'Conversations' }).getByRole('listitem'),
  ).toHaveCount(8);
}

test.describe('keyboard operation', () => {
  test('a whole reply can be produced without a mouse', async ({ page }) => {
    await openInbox(page);

    // The skip link is the first tab stop and jumps past the header's theme control.
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to conversations' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();
    await page.keyboard.press('Enter');

    await page.keyboard.press('Tab');
    const firstConversation = page
      .getByRole('navigation', { name: 'Conversations' })
      .getByRole('button')
      .first();
    await expect(firstConversation).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(firstConversation).toHaveAttribute('aria-current', 'true');

    await tabUntil(page, 'Suggest reply');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Suggestion ready.')).toBeAttached();

    await tabUntil(page, 'Use this reply');
    await page.keyboard.press('Enter');
    const reply = page.getByRole('textbox', { name: 'Reply' });
    await expect(reply).toBeFocused();
    await expect(reply).not.toHaveValue('');

    await tabUntil(page, 'Send');
    await page.keyboard.press('Enter');
    await expect(reply).toHaveValue('');
  });

  test('the skip link stays out of sight until it is focused', async ({ page }) => {
    await openInbox(page);
    const skipLink = page.getByRole('link', { name: 'Skip to conversations' });

    await expect(skipLink).not.toBeInViewport();
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeInViewport();
  });

  test('keyboard focus is visibly indicated', async ({ page }) => {
    await openInbox(page);
    await page.keyboard.press('Tab');

    const outline = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as Element);
      return { width: style.outlineWidth, style: style.outlineStyle };
    });
    expect(outline.style).not.toBe('none');
    expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2);
  });
});
