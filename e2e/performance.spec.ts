import { expect, test } from '@playwright/test';

const MAX_THROTTLED_RESPONSE_MS = 300;

test('keeps the finite simulation responsive under four-times CPU throttling', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Chromium CDP provides the deterministic throttling lane.');
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('/?seed=7319&renderer=canvas');
  await page.locator('.prey-card-actions button').first().click();
  for (const label of ['Stable device', 'Protected cables', 'Open exit', 'Continuous supervision']) await page.getByLabel(label).check();
  await page.getByRole('button', { name: 'Begin muted' }).click();
  await expect(page.locator('.simulation-stage canvas').first()).toBeVisible();

  const frameCount = await page.evaluate(() => new Promise<number>((resolve) => {
    let frames = 0;
    const startedAt = performance.now();
    const sample = (now: number) => {
      frames += 1;
      if (now - startedAt >= 1_500) resolve(frames);
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));

  expect(frameCount).toBeGreaterThan(20);
  await expect(page.locator('.player-topbar > span').last()).not.toContainText('00:00 /');

  const stage = page.locator('.simulation-stage');
  await expect(stage).toHaveAttribute('data-actor-x', /\d/);
  const actor = await stage.evaluate((element) => {
    const actorX = element.getAttribute('data-actor-x');
    const actorY = element.getAttribute('data-actor-y');
    return { x: Number.parseFloat(actorX ?? 'NaN'), y: Number.parseFloat(actorY ?? 'NaN') };
  });
  expect(Number.isFinite(actor.x)).toBe(true);
  expect(Number.isFinite(actor.y)).toBe(true);
  const canvas = stage.locator('canvas').first();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Simulation canvas has no visible bounds.');
  const startedAt = await page.evaluate(() => performance.now());
  await canvas.click({ position: { x: actor.x * bounds.width, y: actor.y * bounds.height } });
  await expect(stage).toHaveAttribute('data-last-contact-response', /.+/);
  const responseLatencyMs = await stage.evaluate((element, started) => {
    const lastContactAt = element.getAttribute('data-last-contact-at');
    return Number.parseFloat(lastContactAt ?? 'NaN') - started;
  }, startedAt);
  expect(responseLatencyMs).toBeLessThan(MAX_THROTTLED_RESPONSE_MS);
});
