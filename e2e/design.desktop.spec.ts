import { expect, satisfySafetyGate, test } from './support';

test('scene choices stay in view and mobile navigation restores focus', async ({ page, networkGuard }) => {
  await page.goto('/');
  const firstPrepare = page.getByRole('button', { name: 'Prepare', exact: true }).first();
  await expect(firstPrepare).toBeInViewport({ ratio: 1 });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(firstPrepare).toBeInViewport({ ratio: 1 });
  const title = page.getByRole('heading', { name: /Pick a quiet encounter/i });
  expect(await title.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.click();
  await page.getByRole('button', { name: 'Observations', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Your local record' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await menu.click();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByLabel('Theme', { exact: false }).selectOption('inside');
  await page.getByLabel('Subject', { exact: false }).selectOption('bird');
  await expect(page.getByText('No scenes found', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.locator('.prey-card')).toHaveCount(5);
  expect(networkGuard.blocked).toEqual([]);
});

test('preparation remains gated and applies the chosen television and motion modes', async ({ page, networkGuard }) => {
  await page.goto('/?renderer=canvas');
  await page.getByRole('button', { name: 'Prepare Paper Moth at Midnight', exact: true }).click();
  const setup = page.getByRole('dialog', { name: 'Set the room.' });
  const start = setup.getByRole('button', { name: 'Start 90-second encounter' });
  await expect(start).toBeDisabled();
  await expect(setup.getByRole('checkbox', { checked: true })).toHaveCount(0);
  await setup.getByRole('radio', { name: /Television/ }).check();
  await setup.getByRole('radio', { name: 'Low', exact: true }).check();
  const checks = setup.getByRole('checkbox');
  for (let index = 0; index < 3; index++) await checks.nth(index).check();
  await expect(start).toBeDisabled();
  await checks.nth(3).check();
  await start.click();
  const stage = page.locator('.simulation-stage');
  await expect(stage).toHaveAttribute('data-playback-mode', 'tv-passive');
  await expect(stage).toHaveAttribute('data-scene-motion', 'low');
  await expect(stage).toHaveCSS('pointer-events', 'none');
  const sound = page.getByRole('button', { name: 'Sound off' });
  await expect(sound).toBeEnabled();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Stop encounter' }).click();
  await expect(page.getByRole('dialog', { name: 'What did you observe?' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish without saving' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(networkGuard.blocked).toEqual([]);
});

test('temporary observations never show a persistent save confirmation', async ({ page, networkGuard }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); });
  await page.goto('/?renderer=canvas');
  await expect(page.getByRole('alert')).toContainText('Changes may not persist');
  await page.getByRole('button', { name: 'Prepare', exact: true }).first().click();
  await satisfySafetyGate(page, 'canvas');
  await page.getByRole('button', { name: 'Stop encounter' }).click();
  await page.getByLabel('Your note').fill('An observation held in this page only.');
  await page.getByLabel('I confirm this descriptive local record.').check();
  await page.getByRole('button', { name: 'Save observation' }).click();
  const receipt = page.getByRole('dialog', { name: 'Observation kept temporarily' });
  await expect(receipt).toBeVisible();
  await expect(receipt).toContainText('may be lost when you close or reload');
  await expect(page.getByText('Stored in this browser.', { exact: true })).toHaveCount(0);
  await receipt.getByRole('button', { name: 'View observations' }).click();
  const history = page.getByRole('dialog', { name: 'Your local record' });
  await expect(history.getByRole('button', { name: 'Observations' })).toContainText('1');
  await expect(history.getByRole('button', { name: 'Export JSON' })).toBeDisabled();
  expect(networkGuard.blocked).toEqual([]);
});
