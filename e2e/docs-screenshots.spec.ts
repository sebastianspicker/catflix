import { expect, test } from '@playwright/test';

const screenshotDirectory = 'docs/screenshots';

async function waitForArtwork(page: import('@playwright/test').Page) {
  await expect(page.getByRole('heading', { name: /Pick a quiet encounter/i })).toBeVisible();
  await page.locator('.prey-card img').first().waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const image = document.querySelector('.prey-card img');
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
  });
}

test('capture the desktop catalogue and safety gate', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/?seed=7319');
  await waitForArtwork(page);
  await page.screenshot({ path: `${screenshotDirectory}/catalogue-desktop.png`, animations: 'disabled' });

  await page.getByRole('button', { name: 'Play Balcony Birds at Dusk' }).click();
  await expect(page.getByRole('heading', { name: /Choose the screen.*Set the room/i })).toBeVisible();
  await page.screenshot({ path: `${screenshotDirectory}/safety-gate.png`, animations: 'disabled' });
});

test('capture a deterministic tablet scene', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/?seed=7319&renderer=canvas');
  await waitForArtwork(page);
  await page.getByRole('button', { name: 'Play Balcony Birds at Dusk' }).click();
  for (const label of ['Stable device', 'Protected cables', 'Open exit', 'Continuous supervision']) {
    await page.getByLabel(label).check();
  }
  await page.getByRole('button', { name: 'Begin muted' }).click();
  await expect(page.getByRole('heading', { name: 'Balcony Birds at Dusk' })).toBeVisible();
  await expect(page.locator('.simulation-stage canvas').first()).toBeVisible();
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${screenshotDirectory}/tablet-scene.png`, animations: 'disabled' });
});

test('capture the mobile catalogue', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/?seed=7319');
  await waitForArtwork(page);
  await page.screenshot({ path: `${screenshotDirectory}/catalogue-mobile.png`, animations: 'disabled' });
});
