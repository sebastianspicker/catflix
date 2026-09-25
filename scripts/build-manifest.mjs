import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

export const applicationLimit = 300 * 1024;
export const phaserLimit = 1_500 * 1024;

async function artifactFile(root, file) {
  if (typeof file !== 'string' || !/^[\w./-]+$/.test(file)
    || isAbsolute(file) || file.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Invalid artifact path: ${String(file)}`);
  }
  const path = resolve(root, file);
  const canonical = await realpath(path);
  if (relative(root, canonical).startsWith('..') || !(await stat(canonical)).isFile()) {
    throw new Error(`Invalid artifact file: ${file}`);
  }
  return { file, path, size: (await stat(path)).size };
}

function references(chunk, field) {
  const values = Object.hasOwn(chunk, field) ? chunk[field] : [];
  if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
    throw new Error(`Invalid manifest ${field}`);
  }
  return values;
}

async function readManifest(root) {
  const metadata = await artifactFile(root, '.vite/manifest.json');
  const manifest = JSON.parse(await readFile(metadata.path, 'utf8'));
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Invalid build manifest');
  const files = new Map();
  for (const [key, chunk] of Object.entries(manifest)) {
    if (!chunk || typeof chunk !== 'object') throw new Error(`Invalid manifest entry: ${key}`);
    const artifact = await artifactFile(root, chunk.file);
    files.set(chunk.file, artifact);
    validateDependencies(manifest, chunk);
    for (const file of [...references(chunk, 'css'), ...references(chunk, 'assets')]) await artifactFile(root, file);
  }
  return { manifest, files };
}

function validateDependencies(manifest, chunk) {
  for (const dependency of [...references(chunk, 'imports'), ...references(chunk, 'dynamicImports')]) {
    if (!Object.hasOwn(manifest, dependency)) throw new Error(`Missing manifest entry: ${dependency}`);
  }
}

function applicationEntry(manifest) {
  const entry = manifest['index.html'];
  if (entry?.isEntry !== true || !entry.file.endsWith('.js')) throw new Error('Missing application manifest entry');
}

function closure(manifest, roots, dynamic = false) {
  const visited = new Set();
  const visit = (key) => {
    if (visited.has(key)) return;
    const chunk = manifest[key];
    if (!chunk) throw new Error(`Missing manifest entry: ${key}`);
    visited.add(key);
    for (const dependency of references(chunk, 'imports')) visit(dependency);
    if (dynamic) for (const dependency of references(chunk, 'dynamicImports')) visit(dependency);
  };
  roots.forEach(visit);
  return visited;
}

function htmlRoots(html, manifest) {
  const roots = new Set();
  for (const match of html.matchAll(/<(script|link)\b([^>]+)>/gi)) {
    const attrs = htmlAttributes(match[2]);
    const script = match[1].toLowerCase() === 'script';
    if (!script && !isScriptPreload(attrs)) continue;
    const ref = script ? attrs.src : attrs.href;
    if (!ref) throw new Error('Missing script/preload artifact reference');
    const key = Object.keys(manifest).find((candidate) => {
      const file = manifest[candidate].file;
      return [file, `./${file}`, `/${file}`, `/catflix/${file}`].includes(ref);
    });
    if (!key) throw new Error(`Script/preload missing from manifest: ${ref}`);
    roots.add(key);
  }
  if (!roots.has('index.html')) throw new Error('Application entry missing from HTML');
  return [...roots];
}

function htmlAttributes(source) {
  const pattern = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  return Object.fromEntries([...source.matchAll(pattern)].map((attribute) => [
    attribute[1].toLowerCase(), attribute[2] ?? attribute[3] ?? attribute[4],
  ]));
}

function isScriptPreload(attrs) {
  const relations = (attrs.rel ?? '').toLowerCase().split(/\s+/);
  return relations.includes('modulepreload') || (relations.includes('preload') && attrs.as?.toLowerCase() === 'script');
}

function javascriptBytes(manifest, files, keys) {
  const unique = new Set([...keys].map((key) => manifest[key].file).filter((file) => file.endsWith('.js')));
  return [...unique].reduce((sum, file) => sum + files.get(file).size, 0);
}

export async function verifyBuildBudget(directory = 'dist') {
  const root = await realpath(resolve(directory));
  const { manifest, files } = await readManifest(root);
  applicationEntry(manifest);
  const phaserKeys = Object.keys(manifest).filter((key) => /(?:^|\/)phaser(?:\.esm)?-[\w-]+\.js$/.test(manifest[key].file));
  if (phaserKeys.length !== 1) throw new Error(`Expected one Phaser manifest entry; found ${phaserKeys.length}`);
  const [phaser] = phaserKeys;
  const reachable = closure(manifest, ['index.html'], true);
  const staticKeys = closure(manifest, ['index.html']);
  const preloaded = closure(manifest, htmlRoots(await readFile(resolve(root, 'index.html'), 'utf8'), manifest));
  const eagerFiles = new Set([...staticKeys, ...preloaded].map((key) => manifest[key].file));
  if (eagerFiles.has(manifest[phaser].file)) throw new Error('Phaser must not be eager or preloaded');
  if (!reachable.has(phaser)) throw new Error('Phaser must be dynamically reachable from the application entry');
  const applicationBytes = javascriptBytes(manifest, files, new Set([...staticKeys, ...preloaded]));
  const phaserBytes = files.get(manifest[phaser].file).size;
  if (applicationBytes > applicationLimit) throw new Error(`Initial JavaScript is ${applicationBytes} bytes; limit is ${applicationLimit}`);
  if (phaserBytes > phaserLimit) throw new Error(`Phaser is ${phaserBytes} bytes; limit is ${phaserLimit}`);
  return { applicationBytes, phaserBytes };
}
