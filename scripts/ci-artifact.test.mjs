import assert from 'node:assert/strict';
import { URL } from 'node:url';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';

await test('CI validates and deploys the Pages artifact uploaded after Playwright', async () => {
  const workflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const [, verify, pages, deploy] = workflow.split(/\n {2}(?:verify|pages|deploy):\n/);
  assert.ok(verify.indexOf('npm run verify') < verify.indexOf('npm run test:e2e'));
  assert.ok(verify.indexOf('npm run test:e2e') < verify.indexOf('actions/upload-artifact@'));
  assert.match(verify, /name: catflix-pages-dist\s+path: dist\s+include-hidden-files: true/);
  assert.match(pages, /needs: verify/);
  assert.match(pages, /actions\/download-artifact@/);
  assert.match(pages, /name: catflix-pages-dist\s+path: dist/);
  assert.match(pages, /node scripts\/verify-pages-artifact.mjs && node scripts\/verify-build-budget.mjs/);
  assert.doesNotMatch(pages, /npm ci|npm install|npm run build|upload-artifact/);
  assert.match(deploy, /needs: pages/);
  assert.match(deploy, /github.event_name == 'push' && github.ref == 'refs\/heads\/main'/);
  assert.match(deploy, /name: catflix-pages-dist\s+path: dist/);
  assert.match(deploy, /pages: write\s+id-token: write/);
  assert.doesNotMatch(deploy, /npm ci|npm install|npm run build/);
  const playwright = await readFile(new URL('../playwright.config.ts', import.meta.url), 'utf8');
  assert.match(playwright, /command: 'npm run build:pages && npm run preview:pages'/);
});

await test('CI cancels superseded pull request runs but never a main deployment', async () => {
  const workflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(workflow, /cancel-in-progress: \$\{\{ github.event_name == 'pull_request' \}\}/);
});

await test('workflow actions are pinned to full commit SHAs', async () => {
  const directory = new URL('../.github/workflows/', import.meta.url);
  for (const name of await readdir(directory)) {
    const workflow = await readFile(new URL(name, directory), 'utf8');
    for (const [, reference] of workflow.matchAll(/uses:\s*(\S+)/g)) {
      assert.match(reference, /@[0-9a-f]{40}$/, `${name} uses unpinned ${reference}`);
    }
  }
});
