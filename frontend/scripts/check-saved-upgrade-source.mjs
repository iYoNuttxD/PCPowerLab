// Source handlers and rendered links, with controlled service promises. No browser.
// Run: node frontend/scripts/check-saved-upgrade-source.mjs [--baseline=HEAD]
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(frontend, 'package.json'));
const baseline = process.argv.find(arg => arg.startsWith('--baseline='))?.slice('--baseline='.length);
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-saved-upgrade-'));
const output = join(temporary, 'checks.mjs');
const realReact = require.resolve('react');
const realRouter = require.resolve('react-router-dom');

try {
  await build({
    stdin: { resolveDir: frontend, loader: 'jsx', contents: `
      export { default as React } from 'react';
      export { renderToStaticMarkup } from 'react-dom/server';
      export { MemoryRouter } from 'react-router-dom';
      export { default as SavedBuilds } from './src/pages/SavedBuilds.jsx';
      export { default as UpgradeSuggestions } from './src/pages/UpgradeSuggestions.jsx';
      export { buildToApiPayload } from './src/utils/buildHelpers.js';
    ` },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'saved-upgrade-fixtures', setup(builder) {
      if (baseline) builder.onLoad({ filter: /pages\/(SavedBuilds|UpgradeSuggestions)\.jsx$/ }, ({ path }) => ({
        contents: execFileSync('git', ['show', `${baseline}:${path.slice(resolve(frontend, '..').length + 1)}`], { cwd: frontend, encoding: 'utf8' }), loader: 'jsx'
      }));
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'fixture' }));
      builder.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'fixture' }));
      builder.onResolve({ filter: /\/hooks\/use(BuildState|Components)\.(js|jsx)$/ }, args => ({ path: basename(args.path), namespace: 'fixture' }));
      builder.onResolve({ filter: /\/services\/.*Service\.js$/ }, args => ({ path: basename(args.path, '.js'), namespace: 'service' }));
      builder.onLoad({ filter: /.*/, namespace: 'service' }, ({ path }) => ({ contents: `export const ${path} = new Proxy({}, {get: (_, method) => (...args) => globalThis.__savedUpgrade.service(${JSON.stringify(path)}, method, args)});` }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => {
        let contents;
        if (path === 'react') contents = `import * as Real from ${JSON.stringify(realReact)}; export * from ${JSON.stringify(realReact)}; export default Real.default; ${['useState', 'useRef', 'useMemo', 'useCallback', 'useEffect'].map(name => `export const ${name} = (...args) => globalThis.__savedUpgradeHooks ? globalThis.__savedUpgradeHooks.${name}(...args) : Real.${name}(...args);`).join('\n')}`;
        else if (path === 'router') contents = `import * as Real from ${JSON.stringify(realRouter)}; export * from ${JSON.stringify(realRouter)}; export const useNavigate = () => globalThis.__savedUpgradeHooks ? globalThis.__savedUpgrade.navigate : Real.useNavigate(); export const useSearchParams = () => globalThis.__savedUpgradeHooks ? [new URLSearchParams(globalThis.__savedUpgrade.search), next => { globalThis.__savedUpgrade.search = '?' + next.toString(); }] : Real.useSearchParams();`;
        else if (path.startsWith('useBuildState')) contents = 'export const useBuildState = () => globalThis.__savedUpgrade.build;';
        else contents = 'export const useComponents = () => globalThis.__savedUpgrade.catalog; export const useCatalogComponent = component => ({component: globalThis.__savedUpgrade.catalog.componentMap[typeof component === "string" ? component : component?.id], loading:false, error:""});';
        return { contents, resolveDir: frontend };
      });
    }}]
  });
  const { React, renderToStaticMarkup, MemoryRouter, SavedBuilds, UpgradeSuggestions, buildToApiPayload } = await import(pathToFileURL(output).href);
  const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
  const part = (type, suffix) => ({ id: `${type}-${suffix}`, name: `${type} ${suffix}`, category: type, price: 100 });
  const selection = suffix => ({ ...Object.fromEntries(types.map(type => [type, part(type, suffix)])), cooler: part('cooler', suffix), fans: [{ ...part('fan', suffix), quantity: 2 }] });
  const current = selection('current');
  const saved = [
    { id: 'saved-a', name: 'Build A', components: buildToApiPayload(selection('a')) },
    { id: 'saved-b /ç?', name: 'Build B', components: buildToApiPayload(selection('b')) }
  ];
  const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
  const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  let fixture;
  function reset(search = '', list = async () => saved) {
    const allParts = [current, selection('a'), selection('b')].flatMap(value => Object.values(value).flat());
    fixture = {
      search, calls: [], actions: [], list,
      navigate: (...args) => fixture.calls.push({ name: 'navigate', args }),
      build: { revision: 7, selectedComponents: current, buildPayload: buildToApiPayload(current), usageType: 'gaming', budget: { amount: 5000 }, game: {}, actions: new Proxy({}, { get: (_, name) => (...args) => fixture.actions.push({ name, args }) }) },
      catalog: { components: allParts, componentMap: Object.fromEntries(allParts.map(component => [component.id, component])), loading: false, error: '', reload() {} },
      service(name, method, args) {
        if (name === 'savedBuildsService' && method === 'list') return fixture.list();
        if (method === 'list') return Promise.resolve([]);
        fixture.calls.push({ name, method, args });
        if (name === 'upgradeService') return Promise.resolve({ summary: 'Suggested saved build', suggestions: [] });
        if (name === 'upgradeRoadmapService') return Promise.resolve({ summary: 'Roadmap saved build', steps: [] });
        throw new Error(`Unexpected ${name}.${method}`);
      }
    };
    globalThis.__savedUpgrade = fixture;
  }
  const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  const label = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(label).join('') : node?.props ? label(node.props.children) : '';
  const named = (tree, name) => all(tree, node => node.type?.name === name);
  function button(tree, text) { const found = named(tree, 'Button').find(node => label(node).trim() === text); assert(found, `Missing button: ${text}`); return found; }
  const sourceSelect = tree => all(tree, node => node.props?.label === 'Build salva')[0];
  const render = tree => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/upgrades' + fixture.search] }, tree));
  function runtime(Component) {
    const slots = []; let index = 0, effects = [];
    const same = (a, b) => a && b && a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
    const hooks = {
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
      useRef(initial) { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
      useMemo(callback, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: callback() }; return slots[i].value; },
      useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
      useEffect(callback, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) { const previous = slots[i]; slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = callback(); }); } }
    };
    return {
      render() { index = 0; effects = []; globalThis.__savedUpgradeHooks = hooks; let tree; try { tree = Component(); } finally { delete globalThis.__savedUpgradeHooks; } effects.forEach(effect => effect()); return tree; },
      close() { slots.forEach(slot => slot?.cleanup?.()); }
    };
  }
  async function assertBlocked(tree) {
    for (const text of ['Gerar sugestões', 'Gerar plano de upgrades']) {
      assert(button(tree, text).props.disabled, `${text} must be disabled for an unresolved source`);
      await button(tree, text).props.onClick();
    }
    assert.deepEqual(fixture.calls, [], 'Even direct handler invocation must not use the current build');
    assert.deepEqual(fixture.actions, [], 'Selecting an upgrade source must preserve the global build');
  }

  reset();
  const savedPage = runtime(SavedBuilds);
  savedPage.render(); await tick(); let tree = savedPage.render();
  const links = all(tree, node => label(node).trim() === 'Upgrade' && node.props?.to);
  assert.deepEqual(links.map(link => link.props.to), saved.map(item => `/upgrades?buildId=${encodeURIComponent(item.id)}`));
  const markup = render(tree);
  assert(markup.includes(`href="${links[1].props.to}"`), 'Real router SSR must render the saved B destination');
  const destination = links[1].props.to;
  savedPage.close();
  console.log('PASS: each actual saved-build card renders an encoded Upgrade URL identifying that build');

  const loading = deferred();
  reset(new URL(destination, 'https://example.test').search, () => loading.promise);
  const page = runtime(UpgradeSuggestions);
  tree = page.render();
  assert.equal(sourceSelect(tree).props.value, saved[1].id);
  assert(render(tree).includes('Carregando a build salva selecionada'));
  await assertBlocked(tree);
  loading.resolve(saved); await tick(); tree = page.render();
  assert.equal(sourceSelect(tree).props.value, saved[1].id);
  await button(tree, 'Gerar sugestões').props.onClick();
  await button(tree, 'Gerar plano de upgrades').props.onClick();
  assert.deepEqual(fixture.calls.map(call => call.name), ['upgradeService', 'upgradeRoadmapService']);
  assert.equal(fixture.calls[0].args[0].buildId, saved[1].id);
  assert.equal(fixture.calls[0].args[0].build, undefined);
  assert.deepEqual(fixture.calls[1].args[0].build, saved[1].components);
  assert.deepEqual(fixture.actions, []);
  assert.deepEqual(fixture.build.selectedComponents, current);
  console.log('PASS: saved B remains the source through loading; both upgrade handlers target B and preserve global A');

  const late = deferred();
  const service = fixture.service;
  fixture.service = (name, method, args) => name === 'upgradeService' ? late.promise : service(name, method, args);
  tree = page.render(); const pending = button(tree, 'Gerar sugestões').props.onClick();
  fixture.search = '?buildId=saved-a'; tree = page.render();
  assert.equal(sourceSelect(tree).props.value, saved[0].id);
  late.resolve({ summary: 'OBSOLETE SAVED B RESPONSE', suggestions: [] }); await pending;
  tree = page.render(); assert(!render(tree).includes('OBSOLETE SAVED B RESPONSE'));
  fixture.service = service;
  fixture.calls.length = 0;
  await button(tree, 'Gerar sugestões').props.onClick();
  assert.equal(fixture.calls[0].args[0].buildId, saved[0].id);
  sourceSelect(tree).props.onChange({ target: { value: '' } }); tree = page.render();
  fixture.calls.length = 0;
  await button(tree, 'Gerar sugestões').props.onClick();
  assert.equal(fixture.calls[0].args[0].buildId, undefined);
  assert.deepEqual(fixture.calls[0].args[0].build, buildToApiPayload(current));
  assert.deepEqual(fixture.actions, []);
  page.close();
  console.log('PASS: changed route source rejects a late result; current A is used only after explicit selection');

  for (const query of ['?buildId=deleted-build', '?buildId=']) {
    reset(query);
    const missingPage = runtime(UpgradeSuggestions);
    missingPage.render(); await tick(); tree = missingPage.render();
    await assertBlocked(tree);
    assert(render(tree).includes('A build salva selecionada não está disponível'));
    button(tree, 'Usar build atual').props.onClick(); tree = missingPage.render();
    await button(tree, 'Gerar sugestões').props.onClick();
    assert.deepEqual(fixture.calls[0].args[0].build, buildToApiPayload(current));
    missingPage.close();
  }
  console.log('PASS: unknown and empty requested IDs remain blocked until the user explicitly chooses another source');

  reset('?buildId=saved-a', async () => { throw new Error('offline'); });
  const failedPage = runtime(UpgradeSuggestions);
  failedPage.render(); await tick(); tree = failedPage.render();
  await assertBlocked(tree);
  const retry = named(tree, 'ErrorState').find(node => node.props.onRetry);
  assert(retry); assert(render(tree).includes('offline'));
  fixture.list = async () => saved;
  retry.props.onRetry(); tree = failedPage.render(); await assertBlocked(tree);
  await tick(); tree = failedPage.render();
  await button(tree, 'Gerar sugestões').props.onClick();
  assert.equal(fixture.calls[0].args[0].buildId, saved[0].id);
  failedPage.close();
  console.log('PASS: failed saved-source loading shows a recoverable error; retry retains the requested ID');

  reset('?buildId=saved-a', async () => ({ unexpected: true }));
  const malformedPage = runtime(UpgradeSuggestions);
  malformedPage.render(); await tick(); tree = malformedPage.render();
  await assertBlocked(tree);
  assert(render(tree).includes('Resposta de builds salvas inválida'));
  malformedPage.close();
  console.log('PASS: malformed saved-list response cannot become a successful empty list or current-build fallback');

  reset();
  const validationPage = runtime(UpgradeSuggestions);
  validationPage.render(); await tick(); tree = validationPage.render();
  for (const value of ['', '0', '-1', '0.5', '1.5', '3.2', '5.5', '6']) {
    all(tree, node => node.props?.label === 'Número máximo de etapas')[0].props.onChange({ target: { value } });
    tree = validationPage.render();
    await button(tree, 'Gerar plano de upgrades').props.onClick();
    tree = validationPage.render();
    assert.deepEqual(fixture.calls, [], `Invalid maxSteps=${value} must not reach the API`);
    const field = all(tree, node => node.props?.label === 'Número máximo de etapas')[0];
    assert(field.props.error, 'Invalid step count must be attached to its field');
    const fieldHtml = render(field);
    assert(fieldHtml.includes('aria-invalid="true"'));
    assert(fieldHtml.includes('aria-describedby='));
    assert(fieldHtml.includes('class="field-error"'));
    assert(fieldHtml.includes('quantidade inteira de etapas'));
  }
  all(tree, node => node.props?.label === 'Número máximo de etapas')[0].props.onChange({ target: { value: '3' } });
  tree = validationPage.render();
  assert.equal(all(tree, node => node.props?.label === 'Número máximo de etapas')[0].props.error, '');
  await button(tree, 'Gerar plano de upgrades').props.onClick();
  assert.equal(fixture.calls[0].args[0].maxSteps, 3);
  validationPage.close();
  console.log('PASS: invalid roadmap step counts have accessible local errors and never reach the API; a valid integer retries successfully');
  console.log('LIMITATION: source handlers and real router SSR; no browser events, live router history, layout, or HTTP transport in this focused regression');
} finally {
  delete globalThis.__savedUpgradeHooks;
  delete globalThis.__savedUpgrade;
  await rm(temporary, { recursive: true, force: true });
}
