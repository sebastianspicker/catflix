import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.CATFLIX_E2E_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/docs-screenshots.spec.ts',
  fullyParallel: true,
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: { command: `vite build && vite preview --strictPort --port ${port}`, url: baseURL, reuseExistingServer: false },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-ipad', use: { ...devices['iPad Pro 11'], browserName: 'webkit' } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
});
