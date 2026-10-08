// Sanitized portable equivalent of the historical wrapper; not a new test run.
import config from '../../../frontend/playwright.config.js';
import { fileURLToPath } from 'node:url';
const frontend = fileURLToPath(new URL('../../../frontend/', import.meta.url));
export default {
  ...config,
  testDir: `${frontend}/tests/e2e`,
  outputDir: `${frontend}/test-results/baseline-e2e`,
  use: { ...config.use, launchOptions: { ...config.use.launchOptions, executablePath: '/usr/bin/chromium' } },
  webServer: { ...config.webServer, cwd: frontend }
};
