import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { applicationLimit, phaserLimit, verifyBuildBudget } from './build-manifest.mjs';

async function fixture(t, mutate = () => {}, base = '/') {
  const root = await mkdtemp(join(tmpdir(), 'catflix-manifest-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const manifest = {
    'index.html': { file: 'assets/index-main.js', isEntry: true, imports: ['shared'], dynamicImports: ['player'] },
    shared: { file: 'assets/shared.js' },
    player: { file: 'assets/player.js', imports: ['shared'], dynamicImports: ['phaser'] },
    phaser: { file: 'assets/phaser-abc.js' },
  };
  const state = { manifest, sizes: {}, html: `<script type="module" src="${base}assets/index-main.js"></script>` };
  mutate(state);
  await mkdir(join(root, '.vite'));
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, '.vite/manifest.json'), JSON.stringify(manifest));
  await writeFile(join(root, 'index.html'), state.html);
  for (const file of ['index-main.js', 'shared.js', 'player.js', 'phaser-abc.js']) {
    await writeFile(join(root, 'assets', file), 'x'.repeat(state.sizes[file] ?? 10));
  }
  return root;
}

for (const base of ['/', '/catflix/']) {
  await test(`validates dynamic graph for ${base} and counts shared JS once`, async (t) => {
    const root = await fixture(t, ({ manifest, sizes }) => {
      manifest['index.html'].imports.push('alias');
      manifest.alias = { file: 'assets/shared.js' };
      sizes['index-main.js'] = applicationLimit - 10;
      sizes['phaser-abc.js'] = phaserLimit;
    }, base);
    assert.deepEqual(await verifyBuildBudget(root), { applicationBytes: applicationLimit, phaserBytes: phaserLimit });
  });
}

const rejected = [
  ['direct eager Phaser', ({ manifest }) => { manifest['index.html'].imports.push('phaser'); }, /eager/],
  ['transitive eager Phaser', ({ manifest }) => { manifest.shared.imports = ['phaser']; }, /eager/],
  ['unquoted uppercase preload', (state) => { state.html += '<LINK REL = modulepreload HREF = /assets/phaser-abc.js>'; }, /preloaded/],
  ['Phaser preload', (state) => { state.html += '<link rel="modulepreload" href="/assets/phaser-abc.js">'; }, /preloaded/],
  ['transitive preload', (state) => { state.manifest.player.imports.push('phaser'); state.html += '<link rel="modulepreload" href="/assets/player.js">'; }, /preloaded/],
  ['oversize static closure', ({ sizes }) => { sizes['index-main.js'] = applicationLimit; }, /Initial JavaScript/],
  ['oversize Phaser', ({ sizes }) => { sizes['phaser-abc.js'] = phaserLimit + 1; }, /Phaser is/],
  ['missing dependency entry', ({ manifest }) => { manifest.shared.imports = ['absent']; }, /Missing manifest entry/],
  ['missing file', ({ manifest }) => { manifest.shared.file = 'assets/missing.js'; }, /ENOENT/],
  ['missing entry metadata', ({ manifest }) => { delete manifest['index.html'].isEntry; }, /Missing application/],
  ['unreachable Phaser', ({ manifest }) => { manifest.player.dynamicImports = []; }, /dynamically reachable/],
  ['invalid path', ({ manifest }) => { manifest.shared.file = '../outside.js'; }, /Invalid artifact path/],
  ['invalid dependency metadata', ({ manifest }) => { manifest.shared.imports = 'phaser'; }, /Invalid manifest imports/],
  ['unmapped preload', (state) => { state.html += '<link rel="preload" as="script" href="/unmapped.js">'; }, /missing from manifest/],
];
for (const [name, mutate, error] of rejected) {
  await test(`rejects ${name}`, async (t) => { await assert.rejects(verifyBuildBudget(await fixture(t, mutate)), error); });
}

await test('requires manifest metadata', async (t) => {
  const root = await fixture(t);
  await rm(join(root, '.vite/manifest.json'));
  await assert.rejects(verifyBuildBudget(root), /ENOENT/);
});
