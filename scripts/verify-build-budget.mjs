import { readdir as readDirectory, readFile as readTextFile, stat as getFileStatus } from 'node:fs/promises';
import { resolve } from 'node:path';

const assetsDirectory = resolve('dist/assets');
// Leave enough headroom for deterministic minifier/hash drift while still
// rejecting an accidental eager feature or Phaser import.
const mainBundleLimit = 300 * 1024;
const phaserBundleLimit = 1_500 * 1024;

const assets = await readDirectory(assetsDirectory, { withFileTypes: true });
const javascriptAssets = assets.filter((asset) => asset.isFile() && asset.name.endsWith('.js'));

function findSingleAsset(name, pattern) {
  const matches = javascriptAssets.filter((asset) => pattern.test(asset.name));
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one ${name} bundle, found ${matches.length}: ${matches.map((asset) => asset.name).join(', ') || 'none'}`);
  }
  return matches[0];
}

async function assertBundleAtMost(name, asset, limit) {
  const size = (await getFileStatus(assetPath(asset.name))).size;
  if (size > limit) {
    throw new Error(`${name} bundle ${asset.name} is ${size} bytes; limit is ${limit} bytes`);
  }
  return size;
}

function assetPath(name) {
  if (!/^[A-Za-z0-9_.-]+$/.test(name)) throw new Error(`Unexpected asset filename ${name}.`);
  return resolve(assetsDirectory, name);
}

const mainBundle = findSingleAsset('main application', /^index-[A-Za-z0-9_-]+\.js$/);
const phaserBundle = findSingleAsset('lazy Phaser', /^phaser(?:\.esm)?-[A-Za-z0-9_-]+\.js$/);

const [mainBytes, phaserBytes] = await Promise.all([
  assertBundleAtMost('Main application', mainBundle, mainBundleLimit),
  assertBundleAtMost('Lazy Phaser exception', phaserBundle, phaserBundleLimit),
]);

const importerSources = await Promise.all(
  javascriptAssets
    .filter((asset) => asset.name !== phaserBundle.name)
    .map(async (asset) => ({
      name: asset.name,
      source: await readTextFile(assetPath(asset.name), 'utf8'),
    })),
);
const importer = importerSources.find(({ source }) => source.includes(`./${phaserBundle.name}`));
if (!importer) {
  throw new Error(`No application chunk retains ${phaserBundle.name} as a lazy import`);
}

console.log(`Build budgets passed: main ${mainBytes}/${mainBundleLimit} bytes; lazy Phaser ${phaserBytes}/${phaserBundleLimit} bytes via ${importer.name}.`);
