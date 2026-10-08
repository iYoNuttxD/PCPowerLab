import { randomUUID } from 'node:crypto';
import { defineConfig } from '@playwright/test';

// Isolated in-memory backend. Never read the developer's administrative password.
process.env.PCPOWERLAB_QA_ADMIN_PASSWORD ||= randomUUID();

export default defineConfig({
  testDir: './tests/integration',
  outputDir: './integration-test-results',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 60000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3187',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    // Authentication is exercised here; do not record credentials in traces.
    trace: 'off',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce'
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ],
  webServer: {
    command: 'node ../src/server.js',
    url: 'http://localhost:3187/api/v1/health',
    reuseExistingServer: false,
    env: { NODE_ENV: 'production', PORT: '3187', API_PREFIX: '/api/v1', ADMIN_PASSWORD: process.env.PCPOWERLAB_QA_ADMIN_PASSWORD }
  }
});
