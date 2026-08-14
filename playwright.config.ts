import { defineConfig, devices } from '@playwright/test';
import process from 'node:process';

const port = Number(process.env.CATFLIX_E2E_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/docs-screenshots.spec.ts', '**/pages.spec.ts'],
  // Browser startup and first navigation can consume most of a minute on a
  // cold Firefox worker. Keep assertions strict while giving complete flows
  // enough time to run after their fixtures are ready.
  timeout: 120_000,
  fullyParallel: false,
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: { command: `vite build && vite preview --strictPort --port ${port}`, url: baseURL, reuseExistingServer: false },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-ipad', use: { ...devices['iPad Pro 11'], browserName: 'webkit' } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
});
