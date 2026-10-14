// Actual Insights page handlers and SSR, with controlled hooks and the real backend
// ranking service. This checks contracts and markup, not browser layout or HTTP.
// --baseline loads Insights from HEAD and is expected to fail before this fix.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { listComponentsByCostBenefit } from '../../src/services/costBenefitService.js';
import { performanceParameterTypes } from '../../src/models/performanceParameterModel.js';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(frontend, 'package.json'));
const realReact = require.resolve('react');
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-insights-'));
const output = join(temporary, 'check.mjs');
let groups = 0;
const pass = message => console.log(`PASS ${++groups}: ${message}`);
let fixture;

try {
  await build({
    stdin: { resolveDir: frontend, loader: 'jsx', contents: `
      export { default as React } from 'react';
      export { renderToStaticMarkup } from 'react-dom/server';
      export { default as Insights } from './src/pages/Insights.jsx';
    ` },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'ranking-contract-fixtures', setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
        import * as Real from ${JSON.stringify(realReact)};
        export * from ${JSON.stringify(realReact)};
        export default Real.default;
        export const useState = (...args) => globalThis.__rankingHooks ? globalThis.__rankingHooks.useState(...args) : Real.useState(...args);
        export const useEffect = (...args) => globalThis.__rankingHooks ? globalThis.__rankingHooks.useEffect(...args) : Real.useEffect(...args);
      `, resolveDir: frontend }));
      builder.onResolve({ filter: /\/services\/costBenefitService\.js$/ }, () => ({ path: 'ranking', namespace: 'service' }));
      builder.onLoad({ filter: /.*/, namespace: 'service' }, () => ({ contents: 'export const costBenefitService = { listComponents: filters => globalThis.__rankingService(filters) };' }));
      builder.onResolve({ filter: /\/hooks\/useComponents\.js$/ }, () => ({ path: 'catalog', namespace: 'catalog' }));
      builder.onLoad({ filter: /.*/, namespace: 'catalog' }, () => ({ contents: 'export const useCatalogComponent = component => ({ component, loading: false });' }));
      if (process.argv.includes('--baseline')) builder.onLoad({ filter: /\/pages\/Insights\.jsx$/ }, () => ({
        contents: execFileSync('git', ['show', 'HEAD:frontend/src/pages/Insights.jsx'], { cwd: frontend, encoding: 'utf8' }),
        loader: 'jsx', resolveDir: join(frontend, 'src/pages')
      }));
    } }]
  });
  const { React, renderToStaticMarkup, Insights } = await import(pathToFileURL(output).href);
  const tick = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };
  const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  const field = (tree, label) => { const match = all(tree, node => node.props?.label === label)[0]; assert(match, `Missing ${label}`); return match; };
  const button = tree => { const match = all(tree, node => node.type?.name === 'Button')[0]; assert(match); return match; };
  const markup = page => renderToStaticMarkup(React.createElement(React.Fragment, null, page.render()));
  function runtime() {
    const slots = []; let index = 0, effects = [], dirty = false;
    const hooks = {
      useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = { value: initial }; return [slots[slot].value, value => { slots[slot].value = typeof value === 'function' ? value(slots[slot].value) : value; dirty = true; }]; },
      useEffect(callback) { const slot = index++; if (!(slot in slots)) { slots[slot] = {}; effects.push(callback); } }
    };
    return { render() { let tree, cycles = 0; do {
      assert(cycles++ < 20, 'Hooks did not settle'); index = 0; effects = []; dirty = false;
      globalThis.__rankingHooks = hooks;
      try { tree = Insights(); } finally { delete globalThis.__rankingHooks; }
      effects.forEach(effect => effect());
    } while (dirty); return tree; } };
  }
  async function load(handler = listComponentsByCostBenefit) {
    fixture = { calls: [], handler };
    globalThis.__rankingService = async filters => { fixture.calls.push(filters); return fixture.handler(filters); };
    const page = runtime(); page.render(); await tick(); page.render(); return page;
  }
  function change(page, label, value) { field(page.render(), label).props.onChange({ target: { value } }); return page.render(); }
  async function submit(page) { await button(page.render()).props.onClick(); return page.render(); }

  let page = await load();
  const options = field(page.render(), 'Categoria').props.options;
  assert.deepEqual(options.map(option => option.value), ['', ...performanceParameterTypes]);
  assert(!options.some(option => ['fan', 'fans', 'cooler'].includes(option.value)));
  assert.throws(() => listComponentsByCostBenefit({ category: 'fans' }), /Categoria de componente inválida/);
  for (const option of options) {
    change(page, 'Categoria', option.value); await submit(page);
    assert.equal(fixture.calls.at(-1).category, option.value || undefined);
    assert(!markup(page).includes('Categoria de componente inválida'));
  }
  pass('Every offered category reaches the real backend ranking contract; cooling and build-only fans are excluded');

  const invalid = ['0', '-1', '1.5', '', ' ', 'abc', 'Infinity', '51', '99999999999999999999'];
  for (const limit of invalid) {
    change(page, 'Limite', limit); const count = fixture.calls.length; await submit(page);
    assert.equal(fixture.calls.length, count, `Invalid ${JSON.stringify(limit)} must not request`);
    assert.equal(field(page.render(), 'Limite').props.error, 'Informe um número inteiro entre 1 e 50.');
    const html = markup(page);
    assert.match(html, /aria-invalid="true"/);
    assert.match(html, /aria-describedby="[^"]+-description"/);
    assert.match(html, /class="field-error">Informe um número inteiro entre 1 e 50\./);
    assert(!html.includes('Ranking vazio')); assert(!html.includes('Limit invalido'));
  }
  pass('Zero, negative, fractional, blank, nonnumeric and out-of-range limits show an associated inline error without a request or empty-state claim');

  for (const limit of ['1', '50']) {
    change(page, 'Limite', limit); assert.equal(field(page.render(), 'Limite').props.error, '');
    const count = fixture.calls.length; await submit(page);
    assert.equal(fixture.calls.length, count + 1); assert.equal(fixture.calls.at(-1).limit, Number(limit));
    assert(!markup(page).includes('field-error'));
  }
  pass('Valid boundary limits recover and send numeric request parameters');

  page = await load(async () => { throw new Error('Falha de rede de teste'); });
  assert(markup(page).includes('Falha de rede de teste')); assert(!markup(page).includes('Ranking vazio'));
  fixture.handler = () => [];
  await submit(page); assert(markup(page).includes('Ranking vazio')); assert(!markup(page).includes('Falha de rede de teste'));
  change(page, 'Limite', '0'); assert(!markup(page).includes('Ranking vazio')); await submit(page);
  assert(!markup(page).includes('Ranking vazio'));
  change(page, 'Limite', '10'); fixture.handler = () => ({ malformed: true }); await submit(page);
  assert(markup(page).includes('Não foi possível carregar o ranking de custo-benefício.')); assert(!markup(page).includes('Ranking vazio'));
  pass('Only a successful empty array shows empty results; failed and malformed responses remain errors, and changing filters clears old results');

  let release;
  page = await load(() => new Promise(resolve => { release = resolve; }));
  assert(field(page.render(), 'Categoria').props.disabled); assert(field(page.render(), 'Limite').props.disabled);
  assert(button(page.render()).props.disabled); assert(!markup(page).includes('Ranking vazio'));
  release([]); await tick(); assert(!field(page.render(), 'Limite').props.disabled); assert(markup(page).includes('Ranking vazio'));
  pass('Loading disables filter edits and repeated submissions, with no premature empty-state claim');
  console.log(`Insights ranking: ${groups} groups passed (page handlers + SSR + real backend service; no browser claim).`);
} finally {
  delete globalThis.__rankingHooks; delete globalThis.__rankingService;
  await rm(temporary, { recursive: true, force: true });
}
