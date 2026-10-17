import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
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

export default defineConfig({
  plugins: [react()],
  define: { __CATFLIX_VERSION__: JSON.stringify(packageVersion), __CATFLIX_COMMIT__: JSON.stringify(buildCommit()) },
  build: { manifest: true },
  server: { host: '127.0.0.1', port: 4173 },
  preview: { host: '127.0.0.1', port: 4173 },
});
