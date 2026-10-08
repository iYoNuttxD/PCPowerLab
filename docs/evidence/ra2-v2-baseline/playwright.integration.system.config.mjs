import config from '/workspace/shared/pcpowerlab-v2-baseline/frontend/playwright.integration.config.js';
const frontend = '/workspace/shared/pcpowerlab-v2-baseline/frontend';
export default {
  ...config,
  testDir: `${frontend}/tests/integration`,
  outputDir: '/tmp/pcpowerlab-v2-tests/integration-artifacts',
  use: { ...config.use, launchOptions: { ...config.use.launchOptions, executablePath: '/usr/bin/chromium' } },
  webServer: { ...config.webServer, cwd: frontend }
};
