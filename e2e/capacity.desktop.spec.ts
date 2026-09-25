import { readFile } from 'node:fs/promises';
import { maximumBackupBytes } from '../src/local-data/localDataCapacity';
import { expect, importFixture, openLocalRecord, satisfySafetyGate, test } from './support';

async function seedOversizedNotes(page: Parameters<typeof openLocalRecord>[0]) {
  await page.evaluate(async (note) => {
    const request = indexedDB.open('catflix-local', 2);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => { resolve(request.result); };
      request.onerror = () => { reject(request.error ?? new Error('Database open failed')); };
    });
    const transaction = database.transaction('notes', 'readwrite');
    for (let index = 0; index < 270; index++) {
      const value = { ...note, id: `oversized-${index}`, rawNote: 'x'.repeat(20_000) };
      transaction.objectStore('notes').put(value, value.id);
    }
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => { resolve(); };
      transaction.onabort = () => { reject(transaction.error ?? new Error('Database transaction failed')); };
    });
    database.close();
  }, importFixture().notes[0]);
}

test('existing oversized data has an explicit recovery download and retains failed drafts', async ({ page, networkGuard }) => {
  await page.goto('/?renderer=canvas');
  await expect(page.getByRole('heading', { name: /Pick a quiet encounter/i })).toBeVisible();
  await seedOversizedNotes(page);
  await page.reload();
  const record = await openLocalRecord(page);
  await record.getByRole('button', { name: 'Export JSON' }).click();
  await expect(record.getByRole('status')).toContainText('recovery copy');
  await expect(record.getByRole('button', { name: 'Export JSON' })).toBeEnabled();
  await record.getByText('Recover an oversized record', { exact: true }).click();
  const downloadReady = page.waitForEvent('download');
  await record.getByRole('button', { name: 'Download recovery JSON' }).click();
  const download = await downloadReady;
  expect(download.suggestedFilename()).toMatch(/^catflix-local-recovery-.*\.json$/);
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  const bytes = await readFile(downloadedPath);
  expect(bytes.byteLength).toBeGreaterThan(maximumBackupBytes);
  const recovered = JSON.parse(bytes.toString()) as { notes: unknown[] };
  expect(recovered.notes).toHaveLength(270);
  await expect(record.getByRole('status')).toContainText('exceed normal import limits');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Prepare', exact: true }).first().click();
  await satisfySafetyGate(page, 'canvas');
  await page.getByRole('button', { name: 'Stop encounter' }).click();
  const notes = page.getByRole('dialog', { name: 'What did you observe?' });
  await notes.getByLabel('Your note').fill('Keep this unsaved observation.');
  await notes.getByLabel('I confirm this descriptive local record.').check();
  await notes.getByRole('button', { name: 'Save observation' }).click();
  await expect(notes.getByRole('alert')).toContainText('Your draft remains here');
  await expect(notes.getByLabel('Your note')).toHaveValue('Keep this unsaved observation.');
  await expect(notes.getByLabel('I confirm this descriptive local record.')).toBeChecked();
  await expect(page.getByRole('alert').filter({ hasText: 'Local data was not saved:' })).toBeVisible();
  await expect(page.getByText('Local storage warning:', { exact: false })).toHaveCount(0);
  await notes.getByRole('button', { name: 'Finish without saving' }).click();
  await page.getByRole('button', { name: 'Prepare', exact: true }).first().click();
  await satisfySafetyGate(page, 'canvas');
  const backgroundAlert = page.getByRole('alert').filter({ hasText: 'Local data was not saved:' });
  await expect(backgroundAlert).toBeInViewport();
  await backgroundAlert.getByRole('button', { name: 'Dismiss local data alert' }).click();
  await expect(backgroundAlert).toHaveCount(0);
  expect(networkGuard.blocked).toEqual([]);
});

test('uploaded file size is checked before parsing without replacing local data', async ({ page, networkGuard }) => {
  await page.goto('/');
  const record = await openLocalRecord(page);
  await record.getByRole('button', { name: 'Preview import' }).click();
  await record.locator('input[type="file"]').setInputFiles({ name: 'oversized.json', mimeType: 'application/json', buffer: Buffer.alloc(maximumBackupBytes + 1, ' ') });
  await expect(record.getByRole('status')).toContainText('5 MiB or smaller');
  await expect(record.getByRole('status')).toContainText('Existing local records were not changed');
  await expect(record.locator('.import-preview')).toHaveCount(0);
  expect(networkGuard.blocked).toEqual([]);
});

async function leaveRoomForOneObservation(page: Parameters<typeof openLocalRecord>[0]) {
  await page.evaluate(async ({ note, maximumBytes }) => {
    const request = indexedDB.open('catflix-local', 2);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => { resolve(request.result); };
      request.onerror = () => { reject(request.error ?? new Error('Open failed')); };
    });
    const names = ['settings', 'queue', 'progress', 'notes', 'observations', 'comparisons', 'provenance'];
    const read = database.transaction(names, 'readonly');
    const values = await Promise.all(names.map((name) => new Promise<unknown[]>((resolve, reject) => {
      const records = read.objectStore(name).getAll() as IDBRequest<unknown[]>;
      records.onsuccess = () => { resolve(records.result); };
      records.onerror = () => { reject(records.error ?? new Error('Read failed')); };
    })));
    const notes = Array.from({ length: 250 }, (_, index) => ({ ...note, id: `capacity-${index}`, rawNote: 'x'.repeat(20_000) }));
    const data = { schemaVersion: 2, exportedAt: new Date().toISOString(), settings: values[0][0], queue: values[1], progress: values[2], notes, observations: values[4], comparisons: values[5], provenance: values[6] };
    const size = () => new TextEncoder().encode(JSON.stringify(data, null, 2)).byteLength;
    while (size() < maximumBytes - 1_000) {
      const next = { ...note, id: `capacity-${notes.length}`, rawNote: '' };
      notes.push(next);
      next.rawNote = 'x'.repeat(Math.min(20_000, maximumBytes - 1_000 - size()));
    }
    const transaction = database.transaction('notes', 'readwrite');
    notes.forEach((item) => transaction.objectStore('notes').put(item, item.id));
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => { resolve(); };
      transaction.onabort = () => { reject(transaction.error ?? new Error('Write failed')); };
    });
    database.close();
  }, { note: importFixture().notes[0], maximumBytes: maximumBackupBytes });
}

async function prepareDraft(page: Parameters<typeof openLocalRecord>[0]) {
  await page.goto('/?renderer=canvas');
  await page.getByRole('button', { name: 'Prepare', exact: true }).first().click();
  await satisfySafetyGate(page, 'canvas');
  await page.getByRole('button', { name: 'Stop encounter' }).click();
  await page.getByLabel('Your note').fill('Concurrent admission');
  await page.getByLabel('I confirm this descriptive local record.').check();
}

test('two tabs cannot both admit an observation into the final backup space', async ({ page, context }) => {
  const other = await context.newPage();
  await prepareDraft(page);
  await prepareDraft(other);
  await leaveRoomForOneObservation(page);
  await Promise.all([page, other].map((tab) => tab.getByRole('button', { name: 'Save observation' }).click()));
  await expect.poll(async () => (await Promise.all([page, other].map((tab) => tab.getByRole('button', { name: 'Saving…' }).count()))).reduce((sum, count) => sum + count, 0)).toBe(0);
  const rejected = await Promise.all([page, other].map((tab) => tab.getByRole('alert').filter({ hasText: 'Your draft remains here' }).count()));
  expect(rejected.reduce((sum, count) => sum + count, 0)).toBe(1);
  const winner = rejected[0] === 0 ? page : other;
  const record = await openLocalRecord(winner);
  await expect(record.getByRole('button', { name: 'Observations' })).toContainText('1');
  const downloadReady = winner.waitForEvent('download');
  await record.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadReady;
  const bytes = await readFile(await download.path());
  expect(bytes.byteLength).toBeLessThanOrEqual(maximumBackupBytes);
  await other.close();
});

test('a comparison write failure rolls back its observation in IndexedDB', async ({ page, networkGuard }) => {
  await page.goto('/?renderer=canvas');
  await page.getByRole('button', { name: 'Curator' }).click();
  await page.getByRole('dialog', { name: /One change/i }).getByRole('button', { name: 'Prepare this run' }).click();
  await satisfySafetyGate(page, 'canvas');
  await page.getByRole('button', { name: 'Stop encounter' }).click();
  await page.getByLabel('Your note').fill('Keep the failed transaction draft.');
  await page.getByLabel('I confirm this descriptive local record.').check();
  await page.evaluate(() => {
    const original = Reflect.get(IDBObjectStore.prototype, 'put');
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      if (this.name === 'comparisons') {
        IDBObjectStore.prototype.put = original;
        throw new Error('Injected comparison write failure');
      }
      return original.call(this, value, key);
    };
  });
  await page.getByRole('button', { name: 'Save observation' }).click();
  await expect(page.getByRole('dialog', { name: 'What did you observe?' }).getByRole('alert')).toContainText('Observation was not saved');
  const counts = await page.evaluate(async () => {
    const request = indexedDB.open('catflix-local', 2);
    const database = await new Promise<IDBDatabase>((resolve) => { request.onsuccess = () => { resolve(request.result); }; });
    const transaction = database.transaction(['observations', 'comparisons'], 'readonly');
    const sizes = await Promise.all(['observations', 'comparisons'].map((name) => new Promise<number>((resolve) => {
      const count = transaction.objectStore(name).count();
      count.onsuccess = () => { resolve(count.result); };
    })));
    database.close();
    return sizes;
  });
  expect(counts).toEqual([0, 0]);
  await expect(page.getByLabel('Your note')).toHaveValue('Keep the failed transaction draft.');
  expect(networkGuard.blocked).toEqual([]);
});
