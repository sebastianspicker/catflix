import { test, expect } from './support';

test('the /demo tour renders every shipped screenshot', async ({ page }) => {
  await page.goto('/catflix/demo');

  await expect(page.getByRole('heading', { level: 1, name: 'Screenshot tour' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the catalogue' })).toHaveAttribute('href', '/catflix/');

  const stops = page.locator('.demo-stop');
  await expect(stops).toHaveCount(4);

  const images = page.locator('.demo-stop img');
  await stops.last().scrollIntoViewIfNeeded();
  await expect.poll(async () => images.evaluateAll((nodes) =>
    nodes.filter((node) => (node as HTMLImageElement).naturalWidth === 0).length)).toBe(0);
});
