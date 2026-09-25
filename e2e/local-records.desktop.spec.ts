import { expect, importFixture, openLocalRecord, scriptLikeNote, test } from './support';

test('desktop import preview, history, literal text, and confirmed deletion persist', async ({ page, networkGuard }) => {
  await page.goto('/');
  const dialog = await openLocalRecord(page);
  await expect(dialog.getByRole('button', { name: 'Close local data' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Local data', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const reopened = await openLocalRecord(page);
  await reopened.getByRole('button', { name: 'Preview import' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'catflix-e2e.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(importFixture())),
  });
  const preview = page.locator('.import-preview');
  await expect(preview.getByRole('heading', { name: 'Import preview' })).toBeVisible();
  await expect(preview).toContainText('observations');
  await preview.getByRole('button', { name: 'Cancel' }).click();
  await expect(preview).toBeHidden();
  await expect(reopened.getByText('Import cancelled. Existing local records were not changed.')).toBeVisible();
  await expect(reopened.getByRole('button', { name: 'Observations' })).toContainText('0');

  await reopened.getByRole('button', { name: 'Preview import' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'catflix-e2e.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(importFixture())),
  });
  await expect(preview.getByRole('heading', { name: 'Import preview' })).toBeVisible();
  await preview.getByRole('button', { name: 'Confirm replacement' }).click();
  await expect(page.getByRole('heading', { name: /Pick a quiet encounter/i })).toBeVisible();

  const record = await openLocalRecord(page);
  await record.getByRole('button', { name: 'Comparisons' }).click();
  const comparisonSides = record.locator('.comparison-side');
  await expect(comparisonSides.nth(0)).toContainText('A');
  await expect(comparisonSides.nth(0)).toContainText('Observation recorded');
  await expect(comparisonSides.nth(1)).toContainText('B');
  await expect(comparisonSides.nth(1)).toContainText('Missing');
  await record.getByRole('button', { name: 'Observations' }).click();
  const observation = page.locator('li').filter({ hasText: scriptLikeNote });
  await expect(observation).toHaveCount(1);
  await observation.getByText('Review observation details').click();
  await expect(observation.getByText(scriptLikeNote, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => '__catflix_e2e__' in window)).toBe(false);

  await observation.getByRole('button', { name: 'Delete' }).click();
  await expect(observation.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await observation.getByRole('button', { name: 'Cancel' }).click();
  await expect(observation).toContainText(scriptLikeNote);
  await observation.getByRole('button', { name: 'Delete' }).click();
  await observation.getByRole('button', { name: 'Delete observation' }).click();
  await expect(page.locator('details').filter({ hasText: scriptLikeNote })).toHaveCount(0);

  await page.reload();
  const afterReload = await openLocalRecord(page);
  await afterReload.getByRole('button', { name: 'Observations' }).click();
  await expect(page.locator('details').filter({ hasText: scriptLikeNote })).toHaveCount(0);
  expect(networkGuard.blocked).toEqual([]);
});
