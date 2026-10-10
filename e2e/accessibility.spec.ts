import { expect, openConversation, requestSuggestion, test } from './fixtures';

test.describe('accessibility (axe, WCAG 2.1 A and AA)', () => {
  test('inbox with nothing selected', async ({ page, makeAxeBuilder }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'No conversation selected' })).toBeVisible();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('conversation with its analysis', async ({ page, makeAxeBuilder }) => {
    await openConversation(page, 'Anna Kowalska');
    await expect(page.getByText('Payment issue')).toBeVisible();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('completed suggestion with sources and a filled reply field', async ({
    page,
    makeAxeBuilder,
  }) => {
    await openConversation(page, 'Anna Kowalska');
    await requestSuggestion(page);
    await expect(page.getByRole('list', { name: 'Knowledge base sources' })).toBeVisible();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('error state', async ({ page, makeAxeBuilder }) => {
    await openConversation(page, 'Anna Kowalska');
    await page.route('**/api/assist/suggestion', (route) => route.abort());
    await page.getByRole('button', { name: 'Suggest reply' }).click();
    await expect(page.getByRole('alert')).toBeVisible();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('narrow viewport', async ({ page, makeAxeBuilder }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openConversation(page, 'Anna Kowalska');
    await requestSuggestion(page);

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('the scanner itself reports a known violation', async ({ page, makeAxeBuilder }) => {
    await page.setContent('<main><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></main>');

    const results = await makeAxeBuilder().analyze();
    expect(results.violations.map((violation) => violation.id)).toContain('image-alt');
  });
});
