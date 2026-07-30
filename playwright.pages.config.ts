import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.CATFLIX_PAGES_PORT ?? 4186);
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: 'pages.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  outputDir: 'test-results/pages',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: origin,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build:pages && vite preview --base=/catflix/ --strictPort --port ${port}`,
    url: `${origin}/catflix/`,
    reuseExistingServer: false,
  },
});
