import type { Page } from '@playwright/test';
import { expect, test } from './support';

interface RafProbe {
  cancelled: number;
  fired: number;
  pending: number;
  requested: number;
  visibilityStates: string[];
}

declare global {
  interface Window {
    __catflixRafProbe: RafProbe;
  }
}

async function installRafProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe: RafProbe = { cancelled: 0, fired: 0, pending: 0, requested: 0, visibilityStates: [] };
    const activeFrames = new Set<number>();
    const requestFrame = window.requestAnimationFrame.bind(window);
    const cancelFrame = window.cancelAnimationFrame.bind(window);
    window.__catflixRafProbe = probe;
    window.requestAnimationFrame = (callback) => {
      probe.requested += 1;
      const frameId = requestFrame((timestamp) => {
        activeFrames.delete(frameId);
        probe.pending = activeFrames.size;
        probe.fired += 1;
        callback(timestamp);
      });
      activeFrames.add(frameId);
      probe.pending = activeFrames.size;
      return frameId;
    };
    window.cancelAnimationFrame = (frameId) => {
      if (activeFrames.delete(frameId)) probe.cancelled += 1;
      probe.pending = activeFrames.size;
      cancelFrame(frameId);
    };
    document.addEventListener('visibilitychange', () => {
      probe.visibilityStates.push(document.visibilityState);
    });
  });
}

async function beginCanvasEncounter(page: Page): Promise<void> {
  await page.goto('/?renderer=canvas');
  await expect(page.getByRole('heading', { name: /Pick a quiet encounter/i })).toBeVisible();
  await page.getByRole('button', { name: 'Prepare', exact: true }).first().click();
  const setup = page.getByRole('dialog', { name: /Set the room/i });
  for (const label of ['Stable device', 'Protected cables', 'Clear exit', 'I will stay and supervise']) {
    await setup.getByLabel(label).check();
  }
  await setup.getByRole('button', { name: /Start \d+-second encounter/ }).click();
  await expect(page.locator('.encounter-player[data-playback-mode="tablet-touch"]')).toBeVisible();
  await expect(page.locator('.simulation-stage canvas[aria-hidden="true"]')).toBeVisible();
}

async function expectNoAnimationFrames(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => window.__catflixRafProbe.pending)).toBe(0);
  const fired = await page.evaluate(() => window.__catflixRafProbe.fired);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__catflixRafProbe.fired)).toBe(fired);
}

async function expectAnimationFramesResume(page: Page): Promise<void> {
  const fired = await page.evaluate(() => window.__catflixRafProbe.fired);
  await expect.poll(() => page.evaluate(() => window.__catflixRafProbe.fired)).toBeGreaterThan(fired);
}

async function simulateDocumentVisibility(page: Page, visibilityState: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((state) => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: state === 'hidden' });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
    document.dispatchEvent(new Event('visibilitychange'));
  }, visibilityState);
}

test('Canvas playback suspends every frame until an explicit owner resume', async ({ page, networkGuard }) => {
  await installRafProbe(page);
  await beginCanvasEncounter(page);
  await expectAnimationFramesResume(page);

  const pause = page.getByRole('button', { name: 'Pause' });
  await pause.click();
  await expect(page.getByText('Encounter paused', { exact: true })).toBeVisible();
  await expectNoAnimationFrames(page);

  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByText('Encounter running', { exact: true })).toBeVisible();
  await expectAnimationFramesResume(page);
  await pause.click();
  await expectNoAnimationFrames(page);

  await page.getByRole('button', { name: 'Resume' }).click();
  await expectAnimationFramesResume(page);
  await test.step('simulate the document becoming hidden', async () => {
    await simulateDocumentVisibility(page, 'hidden');
  });
  await expect(page.getByText('Encounter paused', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__catflixRafProbe.visibilityStates)).toContain('hidden');
  await expectNoAnimationFrames(page);

  await test.step('simulate the document becoming visible without owner input', async () => {
    await simulateDocumentVisibility(page, 'visible');
  });
  await expect(page.getByText('Encounter paused', { exact: true })).toBeVisible();
  await expectNoAnimationFrames(page);
  await page.getByRole('button', { name: 'Resume' }).click();
  await expectAnimationFramesResume(page);
  expect(networkGuard.blocked).toEqual([]);
});
