// Sanitized portable equivalent of the historical wrapper; not a new test run.
import config from '../../../frontend/playwright.integration.config.js';
import { fileURLToPath } from 'node:url';
const frontend = fileURLToPath(new URL('../../../frontend/', import.meta.url));
export default {
  ...config,
  testDir: `${frontend}/tests/integration`,
  outputDir: `${frontend}/test-results/baseline-integration`,
  use: { ...config.use, launchOptions: { ...config.use.launchOptions, executablePath: '/usr/bin/chromium' } },
  webServer: { ...config.webServer, cwd: frontend }
};
