import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { URL } from 'node:url';
import { checkDiagram, checkSourceTree } from './architecture.mjs';

async function fixture(t, files) {
  const root = await mkdtemp(join(tmpdir(), 'catflix-architecture-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [path, content] of Object.entries(files)) {
    const file = join(root, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  return root;
}

await test('reports a forbidden import', async (t) => {
  const root = await fixture(t, {
    'domain/a.ts': 'import { b } from "../local-data/b";\nexport const a = b;\n',
    'local-data/b.ts': 'export const b = 1;\n',
  });
  const { violations } = await checkSourceTree(root);
  assert.ok(violations.some((violation) => /\(domain\) must not depend on .*\(local-data\)/.test(violation)), violations.join('\n'));
});

await test('detects a forbidden dependency reached through a re-export', async (t) => {
  const root = await fixture(t, {
    'encounter/engine/a.ts': 'export { b } from "../../local-data/b";\n',
    'local-data/b.ts': 'export const b = 1;\n',
  });
  const { violations } = await checkSourceTree(root);
  assert.ok(violations.some((violation) => /\(encounter-engine\) must not depend on .*\(local-data\)/.test(violation)), violations.join('\n'));
});

await test('detects a forbidden dependency reached through a dynamic import', async (t) => {
  const root = await fixture(t, {
    'encounter/engine/a.ts': 'export const load = () => import("../../local-data/b");\n',
    'local-data/b.ts': 'export const b = 1;\n',
  });
  const { violations } = await checkSourceTree(root);
  assert.ok(violations.some((violation) => /\(encounter-engine\) must not depend on .*\(local-data\)/.test(violation)), violations.join('\n'));
});

await test('reports a dependency cycle', async (t) => {
  const root = await fixture(t, {
    'app/a.ts': 'import { b } from "./b";\nexport const a = 1;\n',
    'app/b.ts': 'import { a } from "./a";\nexport const b = 1;\n',
  });
  const { violations } = await checkSourceTree(root);
  assert.ok(violations.some((violation) => violation.startsWith('dependency cycle:')), violations.join('\n'));
});

await test('reports a diagram edge the config forbids', () => {
  const markdown = '```mermaid\nflowchart TD\n    domain[domain] --> localData[local-data]\n```\n';
  const violations = checkDiagram(markdown);
  assert.ok(violations.some((violation) => /diagram edge domain --> localData .* is not an allowed dependency/.test(violation)), violations.join('\n'));
});

await test('the documented architecture diagram matches the allowed-dependency config', async () => {
  const { readFile } = await import('node:fs/promises');
  const markdown = await readFile(new URL('../docs/ARCHITECTURE.md', import.meta.url), 'utf8');
  assert.deepEqual(checkDiagram(markdown), []);
});
