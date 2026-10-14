import { expect, openConversation, test } from './fixtures';

const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'laptop', width: 1280, height: 800 },
];

for (const viewport of VIEWPORTS) {
  test(`no horizontal scrolling on ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openConversation(page, 'Anna Kowalska');
    await expect(page.getByText('Payment issue')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('reflows at 320px with increased text spacing (WCAG 1.4.10, 1.4.12)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openConversation(page, 'Anna Kowalska');
  await expect(page.getByText('Payment issue')).toBeVisible();
  await page.addStyleTag({
    content: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
      p { margin-bottom: 2em !important; }`,
  });

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
