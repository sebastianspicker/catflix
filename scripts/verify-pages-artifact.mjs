import { access, readFile, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const artifactDirectory = resolve('dist');
const pagesBase = '/catflix/';
const indexPath = resolve(artifactDirectory, 'index.html');
const notFoundPath = resolve(artifactDirectory, '404.html');
const noJekyllPath = resolve(artifactDirectory, '.nojekyll');

const [indexHtml, notFoundHtml, noJekyll] = await Promise.all([
  readFile(indexPath, 'utf8'),
  readFile(notFoundPath, 'utf8'),
  readFile(noJekyllPath, 'utf8'),
]);

if (indexHtml !== notFoundHtml) {
  throw new Error('dist/404.html must be an exact copy of dist/index.html for GitHub Pages history fallback.');
}
if (noJekyll.length !== 0) {
  throw new Error('dist/.nojekyll must be empty.');
}

const references = [...indexHtml.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]);
if (references.length === 0) {
  throw new Error('dist/index.html does not reference any build assets.');
}

for (const reference of references) {
  if (reference.startsWith('data:') || reference.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(reference)) continue;
  if (!reference.startsWith(pagesBase)) {
    throw new Error(`Pages asset reference must start with ${pagesBase}: ${reference}`);
  }

  const assetPath = reference.slice(pagesBase.length).split(/[?#]/, 1)[0];
  const resolvedAssetPath = resolve(artifactDirectory, assetPath);
  if (relative(artifactDirectory, resolvedAssetPath).startsWith('..')) {
    throw new Error(`Pages asset reference escapes dist: ${reference}`);
  }
  await access(resolvedAssetPath);
}

const notFoundStats = await stat(notFoundPath);
if (!notFoundStats.isFile()) {
  throw new Error('dist/404.html must be a file.');
}

console.log(`Pages artifact passed: ${references.length} asset references use ${pagesBase}; 404.html and .nojekyll are present.`);
