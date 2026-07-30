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
  const canvas = stage.locator('canvas').first();
  const measurement = await canvas.evaluate((element) => {
    const stageElement = element.closest('.simulation-stage');
    if (!stageElement) throw new Error('Simulation stage is unavailable.');
    const actorX = Number.parseFloat(stageElement.getAttribute('data-actor-x') ?? 'NaN');
    const actorY = Number.parseFloat(stageElement.getAttribute('data-actor-y') ?? 'NaN');
    const bounds = element.getBoundingClientRect();
    const startedAt = performance.now();
    element.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      clientX: bounds.left + actorX * bounds.width,
      clientY: bounds.top + actorY * bounds.height,
    }));
    const responseAt = Number.parseFloat(stageElement.getAttribute('data-last-contact-at') ?? 'NaN');
    return { actorX, actorY, responseLatencyMs: responseAt - startedAt };
  });
  expect(Number.isFinite(measurement.actorX)).toBe(true);
  expect(Number.isFinite(measurement.actorY)).toBe(true);
  await expect(stage).toHaveAttribute('data-last-contact-response', /.+/);
  expect(Number.isFinite(measurement.responseLatencyMs)).toBe(true);
  expect(measurement.responseLatencyMs).toBeLessThan(MAX_THROTTLED_RESPONSE_MS);
});
