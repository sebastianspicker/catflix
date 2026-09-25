import { expect, test as base, type Page } from '@playwright/test';

type NetworkGuard = { blocked: string[] };

export const test = base.extend<{ networkGuard: NetworkGuard }>({
  networkGuard: async ({ baseURL, page }, use) => {
    const allowedOrigin = new URL(baseURL ?? 'http://127.0.0.1:4174/catflix/').origin;
    const blocked: string[] = [];
    await page.route('**/*', async (route) => {
      const requestUrl = new URL(route.request().url());
      if ((requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:') && requestUrl.origin !== allowedOrigin) {
        blocked.push(requestUrl.href);
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });
    await use({ blocked });
    expect(blocked, `unexpected outbound requests: ${blocked.join(', ')}`).toEqual([]);
  },
});

export { expect };

const timestamp = '2026-07-29T12:00:00.000Z';
const variant = { figureGround: 'natural', motion: 'intermittent', sound: 'off', novelty: 'familiar' } as const;

export const scriptLikeNote = '<script>window.__catflix_e2e__ = true</script>';

export function importFixture() {
  return {
    schemaVersion: 2,
    exportedAt: timestamp,
    settings: { soundEnabled: false, reducedMotion: false, sceneMotionMode: 'standard', safetyAcknowledgedAt: timestamp },
    queue: [{ id: 'queue-e2e', sceneId: 'paper-moth', variant, addedAt: timestamp }],
    progress: [{ sceneId: 'paper-moth', revision: '2026.07.29', elapsedMs: 1_000, durationMs: 90_000, updatedAt: timestamp }],
    notes: [{ id: 'note-e2e', cat: 'Arri', sceneId: 'paper-moth', contentRevision: '2026.07.29', createdAt: timestamp, rawNote: scriptLikeNote, vocabulary: ['orientation'] }],
    observations: [{ schemaVersion: 2, id: 'observation-e2e', sceneId: 'paper-moth', contentRevision: '2026.07.29', variant, playbackMode: 'tablet-touch', viewingDistanceBand: 'near-screen', roomLightBand: 'moderate', soundEnabled: false, observedCat: 'Arri', elapsedMs: 1_000, endReason: 'owner-ended', acceptedContactTimestamps: [100, 500], vocabulary: ['orientation', 'disengagement'], physicalPlayHandoff: 'offered', rawNote: scriptLikeNote, confirmedAt: timestamp }],
    comparisons: [{ id: 'comparison-e2e', createdAt: timestamp, first: { sceneId: 'paper-moth', variant: { ...variant, figureGround: 'enhanced' }, seed: 73, encounterScore: 'authored-score' }, second: { sceneId: 'paper-moth', variant, seed: 73, encounterScore: 'authored-score', observationId: 'observation-e2e' }, changedDimension: 'figureGround', observation: 'Shared seed and score.' }],
    provenance: [{ assetId: 'paper-moth-poster', creator: 'Catflix', source: '/assets/paper-moth.webp', license: 'CC0', derivativeHistory: ['original'], checksum: 'a'.repeat(64), masteringFormat: 'webp', contentRevision: '2026.07.29', savedAt: timestamp }],
  };
}

export async function openLocalRecord(page: Page) {
  const receipt = page.getByRole('dialog', { name: 'Observation saved', exact: true });
  if (await receipt.isVisible()) await receipt.getByRole('button', { name: 'View observations' }).click();
  else await page.getByRole('button', { name: 'Local data', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Your local record' });
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function satisfySafetyGate(page: Page, renderer: 'auto' | 'canvas' = 'auto') {
  const dialog = page.getByRole('dialog', { name: /Set the room/i });
  await expect(dialog).toBeVisible();
  for (const label of ['Stable device', 'Protected cables', 'Clear exit', 'I will stay and supervise']) {
    await dialog.getByLabel(label).check();
  }
  await dialog.getByLabel('Observing').selectOption({ label: 'Arri' });
  await dialog.getByRole('button', { name: /Start \d+-second encounter/ }).click();
  await expect(page.locator('.encounter-player[data-playback-mode="tablet-touch"]')).toBeVisible();
  const canvas = renderer === 'canvas' ? '.simulation-stage canvas[aria-hidden="true"]' : '.simulation-stage canvas:not([aria-hidden="true"])';
  await expect(page.locator(canvas)).toBeVisible({ timeout: 15_000 });
}

export async function saveOwnerEndedObservation(page: Page, note: string) {
  await page.getByRole('button', { name: 'Stop encounter' }).click();
  const dialog = page.getByRole('dialog', { name: 'What did you observe?' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('End reason').selectOption('owner-ended');
  await dialog.getByLabel('orientation').check();
  await dialog.getByLabel('Your note').fill(note);
  await dialog.getByLabel('I confirm this descriptive local record.').check();
  await dialog.getByRole('button', { name: 'Save observation' }).click();
  const receipt = page.getByRole('dialog', { name: 'Observation saved', exact: true });
  await expect(receipt).toBeVisible();
  await expect(receipt).toContainText(note);
  await receipt.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Pick a quiet encounter/i })).toBeVisible();
}
