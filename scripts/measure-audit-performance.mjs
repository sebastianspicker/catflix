/* global window, IDBObjectStore, performance */
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';
const url = process.argv[2];
const output = process.argv[3];
if (!url || !output) throw new Error('Usage: node scripts/measure-audit-performance.mjs <Vite dev URL> <output.json>');
const browser = await chromium.launch();
const results = { browser: browser.version(), node: process.version, url, warmups: 1, measuredRuns: 5, playback: {}, history: {} };
const timestamp = '2026-07-29T12:00:00.000Z';
const observation = { schemaVersion: 2, id: 'measure-new', sceneId: 'paper-moth', contentRevision: '2026.07.29', variant: { figureGround: 'natural', motion: 'continuous', sound: 'off', novelty: 'familiar' }, playbackMode: 'tablet-touch', viewingDistanceBand: 'near-screen', roomLightBand: 'moderate', soundEnabled: false, elapsedMs: 1000, endReason: 'owner-ended', acceptedContactTimestamps: [], vocabulary: [], physicalPlayHandoff: 'not-recorded', rawNote: '', confirmedAt: timestamp };
for (const count of [0, 1000, 5000]) {
  results.history[count] = [];
  const page = await browser.newPage();
  await page.goto(url);
  for (let run = -1; run < 5; run++) {
    const result = await page.evaluate(async ({ count, observation, timestamp }) => {
      const { createLocalRepository } = await import('/src/local-data/LocalRepository.ts');
      const repository = createLocalRepository();
      await repository.importData({ schemaVersion: 2, exportedAt: timestamp, settings: { soundEnabled: false, reducedMotion: false, sceneMotionMode: 'standard' }, queue: [], progress: [], notes: [], comparisons: [], provenance: [], observations: Array.from({ length: count }, (_, i) => ({ ...observation, id: `history-${String(i).padStart(5, '0')}` })) });
      const writes = {};
      const originals = {};
      for (const method of ['put', 'delete', 'clear']) {
        originals[method] = IDBObjectStore.prototype[method];
        IDBObjectStore.prototype[method] = function (...args) {
          const key = `${this.name}.${method}`;
          writes[key] = (writes[key] ?? 0) + 1;
          return originals[method].apply(this, args);
        };
      }
      const start = performance.now();
      const history = await repository.saveObservationWithComparison({ ...observation, seed: 73, encounterScore: 'measure-score', comparisonDimension: 'figureGround' });
      const durationMs = performance.now() - start;
      for (const method of Object.keys(originals)) IDBObjectStore.prototype[method] = originals[method];
      if (history.observations.length !== count + 1 || history.comparisons.length !== 1) throw new Error('Incorrect committed history');
      return { durationMs, writes };
    }, { count, observation, timestamp });
    if (run >= 0) results.history[count].push(result);
  }
  await page.close();
  console.log('history', count, results.history[count]);
}
for (const count of [0, 1000, 5000]) {
results.playback[count] = [];
for (let run = -1; run < 5; run++) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript(() => {
    window.__measure = { callbacks: 0, commits: 0 };
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => raf.call(window, (time) => { window.__measure.callbacks++; callback(time); });
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, renderers: new Map(), inject(renderer) { this.renderers.set(1, renderer); return 1; }, onCommitFiberRoot() { window.__measure.commits++; }, onCommitFiberUnmount() {} };
  });
  await page.goto(`${url}?renderer=canvas&seed=73`);
  await page.evaluate(async ({ count, observation, timestamp }) => {
    const { createLocalRepository } = await import('/src/local-data/LocalRepository.ts');
    await createLocalRepository().importData({ schemaVersion: 2, exportedAt: timestamp, settings: { soundEnabled: false, reducedMotion: false, sceneMotionMode: 'standard' }, queue: [], progress: [], notes: [], comparisons: [], provenance: [], observations: Array.from({ length: count }, (_, i) => ({ ...observation, id: `history-${String(i).padStart(5, '0')}` })) });
  }, { count, observation, timestamp });
  await page.reload();
  await page.getByRole('button', { name: 'Play Paper Moth at Midnight', exact: true }).click();
  for (const label of ['Stable device', 'Protected cables', 'Open exit', 'Continuous supervision']) await page.getByLabel(label).check();
  await page.getByRole('button', { name: 'Begin muted' }).click();
  await page.locator('.simulation-stage canvas').waitFor();
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__measure = { callbacks: 0, commits: 0 }; });
  await page.waitForTimeout(3000);
  const active = await page.evaluate(() => ({ ...window.__measure }));
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.__measure = { callbacks: 0, commits: 0 }; });
  await page.waitForTimeout(1000);
  const paused = await page.evaluate(() => ({ ...window.__measure }));
  if (run >= 0) results.playback[count].push({ active, paused });
  await page.close();
  console.log('playback', count, run, { active, paused });
}
}
await browser.close();
await writeFile(output, JSON.stringify(results, null, 2) + '\n');
