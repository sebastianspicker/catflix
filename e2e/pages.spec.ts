import { expect, test } from '@playwright/test';

test('project Pages build preserves the catalogue, research route, and scene assets', async ({ page }) => {
  const failedResponses: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('/catflix/?seed=7319&renderer=canvas');
  await expect(page.getByRole('heading', { name: /Pick a quiet encounter/i })).toBeVisible();
  await expect(page.locator('.prey-card img').first()).toHaveAttribute('src', /^\/catflix\/assets\//);

  await page.getByRole('link', { name: 'Full research record' }).click();
  await expect(page).toHaveURL(/\/catflix\/research$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Scientific foundation for Catflix curation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to catalogue' })).toHaveAttribute('href', '/catflix/');

  await page.getByRole('link', { name: 'Back to catalogue' }).click();
  await page.getByRole('button', { name: 'Play Balcony Birds at Dusk' }).click();
  for (const label of ['Stable device', 'Protected cables', 'Open exit', 'Continuous supervision']) {
    await page.getByLabel(label).check();
  }
  await page.getByRole('button', { name: 'Begin muted' }).click();
  await expect(page.locator('.simulation-stage canvas').first()).toBeVisible();
  await page.waitForTimeout(500);

  expect(failedResponses).toEqual([]);
});
