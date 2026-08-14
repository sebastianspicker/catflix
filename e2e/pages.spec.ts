import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

test('project Pages artifact includes its project-base fallback files', async () => {
  test.skip(Boolean(process.env.CATFLIX_PAGES_LIVE_ORIGIN), 'A live deployment has no local dist artifact.');

  const [indexHtml, fallbackHtml, noJekyll] = await Promise.all([
    readFile('dist/index.html', 'utf8'),
    readFile('dist/404.html', 'utf8'),
    readFile('dist/.nojekyll', 'utf8'),
  ]);

  expect(fallbackHtml).toBe(indexHtml);
  expect(noJekyll).toBe('');
  expect(indexHtml).toMatch(/(?:src|href)="\/catflix\/assets\//);
  expect(indexHtml).not.toMatch(/(?:src|href)="\/assets\//);
});

test('project Pages build preserves the catalogue, research route, and scene assets', async ({ page }) => {
  const researchPath = '/catflix/research';
  const failedResponses: string[] = [];
  page.on('response', (response) => {
    const isExpectedPagesFallback = response.status() === 404
      && response.request().resourceType() === 'document'
      && new URL(response.url()).pathname === researchPath;
    if (response.status() >= 400 && !isExpectedPagesFallback) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  if (!process.env.CATFLIX_PAGES_LIVE_ORIGIN) {
    const fallbackHtml = await readFile('dist/404.html', 'utf8');
    await page.route('**/catflix/research', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'text/html; charset=utf-8',
        body: fallbackHtml,
      });
    });
  }

  const researchResponse = await page.goto(researchPath);
  if (process.env.CATFLIX_PAGES_LIVE_ORIGIN) {
    expect([200, 404]).toContain(researchResponse?.status());
  } else {
    expect(researchResponse?.status()).toBe(404);
  }
  await expect(page).toHaveURL(/\/catflix\/research$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Scientific foundation for Catflix curation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to catalogue' })).toHaveAttribute('href', '/catflix/');

  await page.goto('/catflix/?seed=7319&renderer=canvas');
  await expect(page.getByRole('heading', { name: /Pick a quiet encounter/i })).toBeVisible();
  await expect(page.locator('.prey-card img').first()).toHaveAttribute('src', /^\/catflix\/assets\//);

  await page.getByRole('button', { name: 'Play Balcony Birds at Dusk' }).click();
  for (const label of ['Stable device', 'Protected cables', 'Open exit', 'Continuous supervision']) {
    await page.getByLabel(label).check();
  }
  await page.getByRole('button', { name: 'Begin muted' }).click();
  await expect(page.locator('.simulation-stage canvas').first()).toBeVisible();
  await page.waitForTimeout(500);

  expect(failedResponses).toEqual([]);
});
