import { expect, openConversation, requestSuggestion, test } from './fixtures';

test.describe('suggested reply', () => {
  test('streams a suggestion grounded on FAQ sources and sends it as a reply', async ({ page }) => {
    await openConversation(page, 'Tomasz Nowak');
    await requestSuggestion(page);

    await expect(
      page.getByText(/^Hi Tomasz, yes, we can still change the delivery address/),
    ).toBeVisible();
    const sources = page.getByRole('list', { name: 'Knowledge base sources' });
    await expect(sources.getByText('Delivery FAQ: Changing the delivery address')).toBeVisible();

    await page.getByRole('button', { name: 'Use this reply' }).click();
    const reply = page.getByRole('textbox', { name: 'Reply' });
    await expect(reply).toBeFocused();
    await expect(reply).toHaveValue(/^Hi Tomasz,/);

    await page.getByRole('button', { name: 'Send', exact: true }).click();

    const messages = page.getByRole('list', { name: 'Messages' }).getByRole('listitem');
    await expect(messages).toHaveCount(2);
    await expect(messages.last()).toContainText('Hi Tomasz, yes, we can still change');
    await expect(reply).toHaveValue('');
  });

  test('lets the agent edit the suggestion before sending', async ({ page }) => {
    await openConversation(page, 'Luca Bianchi');
    await requestSuggestion(page);
    await page.getByRole('button', { name: 'Use this reply' }).click();

    const reply = page.getByRole('textbox', { name: 'Reply' });
    await reply.fill('Hi Luca, edited by the agent.');
    await page.getByRole('button', { name: 'Send', exact: true }).click();

    await expect(
      page.getByRole('list', { name: 'Messages' }).getByRole('listitem').last(),
    ).toContainText('edited by the agent');
  });

  test('dismissing a suggestion leaves the reply field untouched', async ({ page }) => {
    await openConversation(page, 'Luca Bianchi');
    await requestSuggestion(page);
    await page.getByRole('button', { name: 'Dismiss' }).click();

    await expect(page.getByRole('list', { name: 'Knowledge base sources' })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Reply' })).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Suggest reply' })).toBeVisible();
  });

  test('regenerates a suggestion', async ({ page }) => {
    await openConversation(page, 'Luca Bianchi');
    await requestSuggestion(page);
    await page.getByRole('button', { name: 'Regenerate' }).click();

    await expect(page.getByText(/return window/)).toBeVisible();
    await expect(page.getByText('Suggestion ready.')).toBeAttached();
  });

  test('a suggestion does not follow instructions hidden in the customer message', async ({
    page,
  }) => {
    await openConversation(page, 'Jakub');
    await requestSuggestion(page);

    await expect(page.getByText(/can't mark the request as completed/)).toBeVisible();
    await expect(page.getByText('Account FAQ: Account and data deletion')).toBeVisible();
  });

  test('shows an error and allows a retry when the request fails', async ({ page }) => {
    await openConversation(page, 'Luca Bianchi');
    await page.route('**/api/assist/suggestion', (route) => route.abort());

    await page.getByRole('button', { name: 'Suggest reply' }).click();
    await expect(page.getByRole('alert')).toContainText('Could not generate a suggestion');

    await page.unroute('**/api/assist/suggestion');
    await page.getByRole('button', { name: 'Regenerate' }).click();
    await expect(page.getByText('Suggestion ready.')).toBeAttached();
  });

  test('explains rate limiting', async ({ page }) => {
    await openConversation(page, 'Luca Bianchi');
    await page.route('**/api/assist/suggestion', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'rate_limited', message: 'Too many requests' } }),
      }),
    );

    await page.getByRole('button', { name: 'Suggest reply' }).click();
    await expect(page.getByRole('alert')).toContainText('Too many requests');
  });

  test('clears the suggestion when another conversation is opened', async ({ page }) => {
    await openConversation(page, 'Luca Bianchi');
    await requestSuggestion(page);

    await page
      .getByRole('navigation', { name: 'Conversations' })
      .getByRole('button', { name: /Sofia Rossi/ })
      .click();

    await expect(page.getByRole('button', { name: 'Suggest reply' })).toBeVisible();
    await expect(page.getByText(/return window/)).toHaveCount(0);
  });
});
