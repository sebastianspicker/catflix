import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, runnerImport, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const packageVersion = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;

// Testers quote this stamp in bug reports; a checkout without Git history reports "unknown".
function buildCommit(): string {
  try {
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const modified = execSync('git status --porcelain --untracked-files=no', { encoding: 'utf8' }).trim() !== '';
    return modified ? `${commit}-modified` : commit;
  } catch {
    return 'unknown';
  }
}

// The catalogue validates its authored manifests when the module loads. Load it once during the
// build, so bad scene data fails `npm run build` instead of shipping a page that throws on start.
const validateCatalogue: Plugin = {
  name: 'catflix-validate-catalogue',
  apply: 'build',
  async buildStart() {
    await runnerImport(fileURLToPath(new URL('./src/catalogue/model/catalogue.ts', import.meta.url)), { configFile: false, logLevel: 'warn' });
  },
};

export default defineConfig({
  plugins: [react(), validateCatalogue],
  define: { __CATFLIX_VERSION__: JSON.stringify(packageVersion), __CATFLIX_COMMIT__: JSON.stringify(buildCommit()) },
  build: { manifest: true },
  server: { host: '127.0.0.1', port: 4173 },
  preview: { host: '127.0.0.1', port: 4173 },
});
