// Deterministic source-token audit, not a browser or a whole-site WCAG certification.
import { writeFile } from 'node:fs/promises';
import { contrastAudit } from './lib/visualContrast.mjs';

const checks = contrastAudit();
const failures = checks.filter(check => check.ratio < check.minimum);
const report = {
  scope: 'V3 wizard, catalog, summary, recommendation and shared controls',
  method: 'WCAG sRGB relative luminance; actual CSS token/declaration inputs; alpha compositing for status surfaces and disabled controls. Decorative separators and disabled controls are not normative requirements.',
  limitation: 'Source-token audit only. Browser geometry, computed cascade, assistive technology and real keyboard interaction remain separate checks.',
  count: checks.length,
  passed: checks.length - failures.length,
  checks: checks.map(check => ({ ...check, ratio: Number(check.ratio.toFixed(3)), passed: check.ratio >= check.minimum }))
};
if (process.argv.includes('--write')) await writeFile(new URL('../../docs/V3_VISUAL_CONTRAST.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
for (const check of checks) console.log(`${check.ratio >= check.minimum ? 'PASS' : 'FAIL'} ${check.name}: ${check.ratio.toFixed(2)}:1 (>= ${check.minimum}:1)`);
console.log(`${report.passed}/${report.count} source-token contrast checks passed; browser verification is not claimed.`);
if (failures.length) process.exitCode = 1;
