import { defineConfig, devices } from '@playwright/test';

const pagesUrl = 'http://127.0.0.1:4174/catflix/';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: pagesUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium-desktop',
      testMatch: /.*\.desktop\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
    },
    {
      name: 'webkit-ipad',
      testMatch: /.*\.ipad\.spec\.ts/,
      use: { ...devices['iPad Pro 11'] },
    },
  ],
  webServer: {
    command: 'npm run build:pages && npm run preview:pages',
    url: pagesUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
