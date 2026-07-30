import { expect, test } from '@playwright/test';

const scenes = [
  'Balcony Birds at Dusk',
  'Koi in Slow Motion',
  'Paper Moth at Midnight',
  'Beetle Beneath the Fern',
  'The Red String Incident',
] as const;
const CHECKPOINT_MATRIX_TIMEOUT_MS = 90_000;

for (const renderer of ['auto', 'canvas'] as const) {
  test(`captures deterministic ${renderer} checkpoints for every scene`, async ({ page }, testInfo) => {
    test.setTimeout(CHECKPOINT_MATRIX_TIMEOUT_MS);
    test.skip(testInfo.project.name === 'firefox', 'Desktop Chromium, tablet WebKit, and mobile Chromium cover the checkpoint matrix.');
    const consoleErrors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

    for (const [index, title] of scenes.entries()) {
      const contrast = index % 2 === 0 ? 'natural' : 'enhanced';
      const playbackMode = index % 2 === 0 ? 'tablet-touch' : 'tv-passive';
      const sceneMotion = index >= 3 ? 'low' : 'standard';
      await page.goto(`/?seed=7319&renderer=${renderer}&contrast=${contrast}`);
      const card = page.locator('.prey-card').filter({ has: page.getByRole('heading', { name: title }) });
      await card.getByRole('button', { name: 'Play', exact: true }).click();
      if (playbackMode === 'tv-passive') await page.getByLabel(/Television/i).check();
      for (const label of ['Stable device', 'Protected cables', 'Open exit', 'Continuous supervision']) await page.getByLabel(label).check();
      await page.getByRole('button', { name: 'Begin muted' }).click();
      const stage = page.locator('.simulation-stage');
      await expect(stage.locator('canvas').first()).toBeVisible();
      if (await stage.getAttribute('data-scene-motion') !== sceneMotion) await page.getByRole('button', { name: /scene motion/ }).click();
      await expect(stage).toHaveAttribute('data-scene-motion', sceneMotion);
      await expect(stage).toHaveAttribute('data-playback-mode', playbackMode);
      await expect(stage).toHaveAttribute('data-figure-ground', contrast);
      await page.waitForTimeout(350 + index * 40);
      const bounds = await stage.boundingBox();
      expect(bounds?.width).toBeGreaterThan(250);
      expect(bounds?.height).toBeGreaterThan(180);
      await page.locator('.stage-wrap').screenshot({ path: testInfo.outputPath(`${index + 1}-${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-${renderer}-${playbackMode}-${contrast}-${sceneMotion}.png`) });
    }

    expect(consoleErrors).toEqual([]);
  });
}
