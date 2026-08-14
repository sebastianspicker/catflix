import { expect, test } from '@playwright/test';

async function confirmSetup(page: import('@playwright/test').Page, mode: 'tablet' | 'television' = 'tablet') {
  if (mode === 'television') await page.getByLabel(/Television/i).check();
  for (const label of ['Stable device', 'Protected cables', 'Open exit', 'Continuous supervision']) await page.getByLabel(label).check();
  await page.getByRole('button', { name: 'Begin muted' }).click();
}

test('catalogue, safety, player, stop, and notes work without a network', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Pick a quiet encounter/i })).toBeVisible();
  await expect(page.locator('.prey-heading > p')).toContainText(/Tablet encounters.*television scenes/i);
  await expect(page.getByRole('group', { name: 'Catalogue filters' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Birds', exact: true })).toBeVisible();

  await page.locator('.prey-card-actions button').first().click();
  await expect(page.getByRole('heading', { name: /Choose the screen.*Set the room/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Begin muted' })).toBeDisabled();
  await confirmSetup(page);

  await expect(page.getByRole('heading', { name: 'Balcony Birds at Dusk' })).toBeVisible();
  await expect(page.getByRole('main', { name: 'Balcony Birds at Dusk' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sound awaiting provenance' })).toBeDisabled();
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.getByRole('button', { name: 'End session' }).last().click();
  await expect(page.getByRole('heading', { name: 'Confirm the record' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Raw note' }).fill('Oriented briefly, then left the room.');
  await page.getByLabel(/confirm this descriptive local record/i).check();
  await page.getByRole('button', { name: 'Save observation' }).click();
  await expect(page.getByRole('heading', { name: /Pick a quiet encounter/i })).toBeVisible();
});

test('curator exposes one-variable matched comparisons', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Curator' }).click();
  await expect(page.getByRole('heading', { name: /One change/i })).toBeVisible();
  await page.getByLabel('Coherent sound').check();
  await page.getByLabel('B / changed dimension').check();
  await expect(page.getByText(/sound on/)).toBeVisible();
});

test('subject filters and card-level queue actions stay local and explicit', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fish', exact: true }).click();
  await expect(page.getByText('1 found / Pick a beautiful distraction')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Koi in Slow Motion' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Balcony Birds at Dusk' })).toHaveCount(0);

  await page.getByRole('button', { name: '+ Queue' }).click();
  await expect(page.getByRole('button', { name: 'Queued' })).toBeVisible();
  await page.getByRole('button', { name: /Queue 1/ }).click();
  await expect(page.getByRole('dialog', { name: 'Queued scenes' })).toContainText('Koi in Slow Motion');
  await expect(page.getByText('Nothing starts automatically.')).toBeVisible();
});

test('empty filter results are explicit and recoverable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Inside', exact: true }).click();
  await page.getByRole('button', { name: 'Birds', exact: true }).click();
  await expect(page.getByText('0 found / Try another combination')).toBeVisible();
  await expect(page.getByText('No prey in this cut')).toBeVisible();
  await expect(page.locator('.prey-card')).toHaveCount(0);

  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.getByText('5 found / Pick a beautiful distraction')).toBeVisible();
  await expect(page.locator('.prey-card')).toHaveCount(5);
});

test('modal surfaces close with Escape and return focus', async ({ page }) => {
  await page.goto('/');
  const curatorButton = page.getByRole('button', { name: 'Curator' });
  await curatorButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: /One change/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /One change/i })).toHaveCount(0);
  await expect(curatorButton).toBeFocused();
});

test('the first storage fallback blocks incomplete local-data transfers', async ({ page }) => {
  await page.addInitScript(() => {
    let pendingRequest: IDBOpenDBRequest | undefined;
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: {
        open: () => {
          const request = {} as IDBOpenDBRequest;
          pendingRequest = request;
          return request;
        },
      },
    });
    Object.defineProperty(window, '__catflixFailPendingIndexedDbOpen', {
      configurable: true,
      value: () => {
        if (!pendingRequest) throw new Error('The fake IndexedDB open has not started.');
        pendingRequest.onerror?.(new Event('error'));
      },
    });
  });
  let downloadCount = 0;
  page.on('download', () => { downloadCount += 1; });
  await page.goto('/');
  const settingsButton = page.getByRole('button', { name: 'Settings' });
  await expect(settingsButton).toBeEnabled();
  await settingsButton.click();
  const dataDialog = page.getByRole('dialog', { name: 'Your local record' });
  const exportButton = dataDialog.getByRole('button', { name: /Export JSON/ });
  await expect(exportButton).toBeEnabled();
  await exportButton.click();
  await page.evaluate(() => {
    (window as Window & { __catflixFailPendingIndexedDbOpen: () => void }).__catflixFailPendingIndexedDbOpen();
  });

  await expect(dataDialog.getByRole('status')).toContainText('Export failed');
  expect(downloadCount).toBe(0);
  await expect(page.getByRole('alert')).toContainText('Local storage warning');
  await expect(page.getByRole('alert')).toContainText('Changes may not persist');
  await expect(dataDialog.getByRole('button', { name: /Export JSON/ })).toBeDisabled();
  await expect(dataDialog.getByRole('button', { name: /Import JSON/ })).toBeDisabled();
});

test('persistent import replacement aborts atomically across every store', async ({ page }) => {
  await page.goto('/');
  const expected = await page.evaluate(async () => {
    const storeNames = ['settings', 'queue', 'progress', 'notes', 'observations', 'comparisons', 'provenance'] as const;
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('catflix-local', 2);
      request.onsuccess = () => { resolve(request.result); };
      request.onerror = () => { reject(request.error ?? new Error('Test database could not open.')); };
    });
    const transaction = database.transaction(storeNames, 'readwrite');
    const original = storeNames.map((store) => ({ store, values: [{ marker: `before-${store}` }] }));
    original.forEach(({ store, values }) => {
      const objectStore = transaction.objectStore(store);
      objectStore.clear();
      objectStore.put(values[0], `before-${store}`);
    });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => { resolve(); };
      transaction.onerror = () => { reject(transaction.error ?? new Error('Test seed transaction failed.')); };
      transaction.onabort = () => { reject(transaction.error ?? new Error('Test seed transaction aborted.')); };
    });
    database.close();

    const nativePut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function injectedPut(value: unknown, key?: IDBValidKey) {
      if (this.name === 'notes' && (value as { rawNote?: string }).rawNote === 'injected persistent write failure') throw new Error('injected persistent write failure');
      return Reflect.apply(nativePut, this, key === undefined ? [value] : [value, key]) as IDBRequest<IDBValidKey>;
    };
    return original;
  });

  await page.getByRole('button', { name: 'Settings' }).click();
  const dataDialog = page.getByRole('dialog', { name: 'Your local record' });
  await dataDialog.locator('input[type="file"]').setInputFiles({
    name: 'atomic-import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      schemaVersion: 1,
      exportedAt: '2026-08-09T12:00:00Z',
      settings: { soundEnabled: false, reducedMotion: false, sceneMotionMode: 'standard' },
      queue: [],
      progress: [],
      notes: [{ id: 'after-notes', cat: 'Arri', sceneId: 'paper-moth', contentRevision: '2026.08.09', createdAt: '2026-08-09T12:00:00Z', rawNote: 'injected persistent write failure', vocabulary: ['tracking'] }],
      comparisons: [],
      provenance: [],
    })),
  });
  await expect(dataDialog.getByRole('status')).toContainText('Import failed');

  const afterFailure = await page.evaluate(async () => {
    const storeNames = ['settings', 'queue', 'progress', 'notes', 'observations', 'comparisons', 'provenance'] as const;
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('catflix-local', 2);
      request.onsuccess = () => { resolve(request.result); };
      request.onerror = () => { reject(request.error ?? new Error('Test database could not reopen.')); };
    });
    const transaction = database.transaction(storeNames, 'readonly');
    const values = await Promise.all(storeNames.map((store) => new Promise<{ store: typeof store; values: unknown[] }>((resolve, reject) => {
      const request = transaction.objectStore(store).getAll();
      request.onsuccess = () => { resolve({ store, values: request.result }); };
      request.onerror = () => { reject(request.error ?? new Error(`Could not read ${store}.`)); };
    })));
    database.close();
    return values;
  });
  expect(afterFailure).toEqual(expected);
});

test('scientific evidence opens at a concise theme and preserves reading context', async ({ page }) => {
  await page.goto('/');
  const evidenceSection = page.getByRole('region', { name: /What we know/i });
  await expect(evidenceSection).toContainText('Attention is observable. Enjoyment is not assumed.');
  const visionSummary = evidenceSection.getByRole('button', { name: /Vision.*TL;DR/i });
  await visionSummary.focus();
  await page.keyboard.press('Enter');

  const evidenceDialog = page.getByRole('dialog', { name: 'What the evidence supports' });
  await expect(evidenceDialog).toBeVisible();
  await expect(evidenceDialog.locator('details').first()).toHaveAttribute('open', '');
  await expect(evidenceDialog.getByText('What this supports').first()).toBeVisible();
  const selectedStudy = evidenceDialog.getByRole('link', { name: /COL-05/ });
  await expect(selectedStudy).toHaveAttribute('href', /^https:\/\/doi\.org\//);
  await expect(selectedStudy).toHaveAttribute('target', '_blank');

  await page.keyboard.press('Escape');
  await expect(evidenceDialog).toHaveCount(0);
  await expect(visionSummary).toBeFocused();
});

test('complete research route renders the authoritative document without page overflow', async ({ page }) => {
  await page.goto('/research');
  await expect(page).toHaveTitle('Scientific foundation — Catflix');
  await expect(page.getByRole('heading', { level: 1, name: 'Scientific foundation for Catflix curation' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Executive decision table' })).toBeVisible();
  await expect(page.getByRole('table').first()).toContainText('Prohibited inference');
  await expect(page.getByRole('link', { name: 'Stable record' }).first()).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('navigation', { name: 'Research document contents' })).toContainText('Limitations and research gaps');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(await page.getByRole('heading', { level: 1 }).evaluate((heading) => heading.getBoundingClientRect().right <= window.innerWidth + 1)).toBe(true);
});

test('scene motion is an explicit persistent setting, independent of OS reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?seed=7319');
  await page.locator('.prey-card-actions button').first().click();
  await confirmSetup(page);
  const standard = page.getByRole('button', { name: 'Standard scene motion' });
  await expect(standard).toHaveAttribute('aria-pressed', 'false');
  await standard.click();
  await expect(page.getByRole('button', { name: 'Low scene motion' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'End session' }).last().click();
  await page.getByRole('button', { name: 'Close notes' }).click();

  await page.reload();
  await page.locator('.prey-card-actions button').first().click();
  await confirmSetup(page);
  await expect(page.getByRole('button', { name: 'Low scene motion' })).toHaveAttribute('aria-pressed', 'true');
});

test('television playback is passive and owner controls stay outside the stage', async ({ page }) => {
  await page.goto('/?seed=7319&renderer=canvas');
  await page.locator('.prey-card-actions button').first().click();
  await confirmSetup(page, 'television');
  const stage = page.locator('.simulation-stage');
  await expect(stage).toHaveAttribute('data-playback-mode', 'tv-passive');
  await expect(page.getByRole('complementary', { name: 'Owner controls' })).toBeVisible();
  const before = await page.locator('.player-topbar > span').last().textContent();
  await stage.click({ position: { x: 100, y: 100 }, force: true });
  await expect(page.locator('.contact-reminder')).toHaveCount(0);
  await expect(page.locator('.player-topbar > span').last()).not.toHaveText(before ?? '');
});
