import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Source contract only; browser geometry is asserted in ready-build-budget-claims.spec.js.
test('nested recommendation cards reserve readable full-row identities at every viewport', async () => {
  const css = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const page = await readFile(new URL('../src/pages/ReadyBuilds.jsx', import.meta.url), 'utf8');
  assert.match(page, /className="cards-grid recommendation-results-grid"/);
  assert.match(css, /\.recommendation-results-grid\s*\{\s*grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 360px\), 1fr\)\)/);
  const override = css.lastIndexOf('/* Nested recommendation cards');
  assert(override > css.indexOf('minmax(96px, 0.8fr)'), 'Readability rules must override the earlier narrow two-column layout');
  const rules = css.slice(override);
  assert.match(rules, /\.recommendation-result-card \.build-parts-list li \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(rules, /\.recommendation-result-card \.build-parts-list li > \.component-identity \{ grid-column: 1 \/ -1; \}/);
  assert.match(rules, /\.recommendation-result-card \.component-identity > \.component-media \{ flex-basis: 56px; \}/);
  assert.match(rules, /\.recommendation-result-card \.component-identity-text \{ flex: 1 1 160px; \}/);
});
