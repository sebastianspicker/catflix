import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.CATFLIX_SCREENSHOT_PORT ?? 4185);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: 'docs-screenshots.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  outputDir: 'test-results/docs-screenshots',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    colorScheme: 'light',
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `vite build && vite preview --strictPort --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
