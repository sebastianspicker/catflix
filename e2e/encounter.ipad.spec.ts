import { expect, openLocalRecord, satisfySafetyGate, saveOwnerEndedObservation, test } from './support';

async function prepareComparison(page: Parameters<typeof satisfySafetyGate>[0], run: 'A / baseline' | 'B / changed dimension') {
  await page.getByRole('button', { name: 'Curator' }).click();
  const curator = page.getByRole('dialog', { name: /One change/i });
  await expect(curator).toBeVisible();
  await curator.getByLabel(run).check();
  await curator.getByRole('button', { name: 'Prepare this run' }).click();
  await satisfySafetyGate(page);
}

test('iPad WebKit completes a supervised tablet observation and a reversed A/B comparison', async ({ page, networkGuard }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Pick a quiet encounter/i })).toBeVisible();
  await page.getByRole('button', { name: 'Prepare', exact: true }).first().click();
  await satisfySafetyGate(page);
  await saveOwnerEndedObservation(page, 'Owner ended after visible orientation.');

  const record = await openLocalRecord(page);
  await record.getByRole('button', { name: 'Observations' }).click();
  const savedObservation = page.locator('li').filter({ hasText: 'Owner ended after visible orientation.' });
  await savedObservation.getByText('Review observation details').click();
  await expect(savedObservation.getByText('Owner ended after visible orientation.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  await prepareComparison(page, 'B / changed dimension');
  await saveOwnerEndedObservation(page, 'Changed side recorded first.');
  await prepareComparison(page, 'A / baseline');
  await saveOwnerEndedObservation(page, 'Baseline recorded second.');

  const history = await openLocalRecord(page);
  await history.getByRole('button', { name: 'Comparisons' }).click();
  await expect(page.getByText('Observation recorded', { exact: true })).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(networkGuard.blocked).toEqual([]);
});
