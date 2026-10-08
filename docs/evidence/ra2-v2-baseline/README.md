# PCPowerLab v2.0 pre-change test baseline

Date: 2026-10-08 UTC  
Source commit: `d433bf930d7373eec073921427e146bc8c173f26`  
Checkout: `.`

## Result

- Backend: **255/255 passed**, 0 failed, 0 skipped, 0 cancelled, 0 todo
- Backend lint and frontend lint: **passed** (exit 0)
- Frontend production build: **passed** (exit 0), with the existing >500 kB chunk warning (JS 796.14 kB; gzip 239.17 kB)
- E2E: **blocked**; 90/90 cases reported failed at browser launch, 0 passed, 0 skipped
- Real-API integration: **blocked**; build succeeded, 15/15 cases reported failed at browser launch, 0 passed, 0 skipped

The original-config and installed-browser attempts are separate runs of the same 105 browser cases. Do not sum them as 210 unique tests. Neither attempt exercised page interactions or application assertions. These failures establish an environment blocker, not an application defect or browser-suite pass.

## Commands and outcomes

Commands below ran in the root checkout or `frontend/` as specified. `run-check.sh` captured stdout/stderr, exit codes, cwd and UTC times without altering commands. Commands with environment-specific paths sanitized and individual outcomes are in `results.json`. Bracketed path labels describe historical locations and are not accessible repository artifacts.

| Cwd | Command | Exit / result |
| --- | --- | --- |
| root | `npm ci` | 254; default npm cache `[default-npm-cache]` ENOENT |
| frontend | `npm ci` | 254; same cache problem |
| root | `npm ci --cache [temporary-run-directory]/npm-cache-root` | 0; 171 packages |
| frontend | `npm ci --cache [temporary-run-directory]/npm-cache-frontend` | 0; 197 packages |
| root | `npm test` | 0; 255 passed |
| root | `npm run lint` | 0 |
| frontend | `npm run lint` | 0 |
| frontend | `npm run build` | 0; chunk warning |
| frontend | `PLAYWRIGHT_BROWSERS_PATH=[temporary-run-directory]/playwright-browsers npm_config_cache=[temporary-run-directory]/npm-cache-frontend npx playwright install chromium` | 1; invalid/truncated ZIP, five internal attempts |
| frontend | same install command with `--only-shell` | 1; same invalid/truncated ZIP, five internal attempts |
| frontend | `npm test -- --list` | 0; 90 tests / 4 files |
| frontend | `npx playwright test --config=playwright.integration.config.js --list` | 0; 15 tests / 1 file |
| frontend | `PLAYWRIGHT_JSON_OUTPUT_FILE=[temporary-run-directory]/e2e-report.json npm test -- --config=[temporary-run-directory]/playwright.system.config.mjs --reporter=list,json` | 1; 90 browser-launch failures |
| frontend | `PLAYWRIGHT_JSON_OUTPUT_FILE=[temporary-run-directory]/integration-report.json npm run test:integration -- --config=[temporary-run-directory]/playwright.integration.system.config.mjs --reporter=list,json` | 1; build passed, 15 browser-launch failures |
| frontend | `PLAYWRIGHT_BROWSERS_PATH=[temporary-run-directory]/playwright-browsers npm test` | 1; original configuration, 90 missing-browser launch failures |
| frontend | `PLAYWRIGHT_BROWSERS_PATH=[temporary-run-directory]/playwright-browsers npm run test:integration` | 1; original configuration, build passed, 15 missing-browser launch failures |

The system-browser attempts preceded the explicit original-config attempts. Both original-config scripts ran to completion; no fail-fast filter or test skip was added. Both configurations retain their existing zero-retry settings.

## Browser blocker and recovery attempts

Playwright 1.64.0 requested Chromium 156.0.8078.4 (revision 1248). Full Chromium and headless-shell downloads each returned an invalid/truncated archive (`End of central directory record signature not found`) through all five built-in attempts. No matching browser executable was installed.

The existing system Chromium 154.0.8037.57 was tested using temporary config wrappers outside the repository. They import the original configs and override only the browser executable and absolute paths needed by the relocated config. The unchanged test cases, viewport projects, server commands, timeouts, workers and retry settings were preserved; list + JSON reporting was added via CLI.

All 105 system-browser cases aborted before page creation with `socket() failed: Operation not permitted (1)`. A separate browser smoke test also failed before page creation. No browser assertions were executed. The original package scripts then confirmed the absent bundled-browser blocker. A browser-capable authorized executor with the matching browser is required to establish the remaining behavioral baseline.

## Environment and integrity

Debian GNU/Linux 13.6 (trixie), x86_64; Node v24.19.0; npm 11.9.0; Vite 7.3.3; Playwright 1.64.0. README prerequisites and both Playwright configurations were read before execution. npm emitted an unrelated `http-proxy` configuration warning.

No app source, tests, package/lockfiles or repository Playwright configs were changed. The focused source diff exited 0. Dependency directories, Vite output, temporary browser attempts and ignored test output were generated. Other workers' documentation changes are outside this test baseline. No commit was made by this worker.

## Evidence

- `results.json`: exact commands, UTC times, exit codes, counts and environment
- `browser-case-results.json`: sanitized per-case results for the installed-browser attempt
- `command-output-excerpts.log`: selected output with path redactions, plus historical SHA-256 of each original full local log (not a hash of the sanitized excerpts)
- `playwright.system.config.mjs` and `playwright.integration.system.config.mjs`: portable sanitized equivalents of the historical wrappers; changes are not a new execution
- Original full local logs and failed-launch artifacts were temporary and are not delivered as repository files

Committed evidence excludes credentials, environment dumps containing secrets, raw trace ZIPs and repetitive archive errors. Integration traces remained disabled by its original configuration. No browser screenshot could be captured because no page opened.
