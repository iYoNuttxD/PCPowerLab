// Server rendering and isolated handler checks. Does not start a browser/server.
// Run: node frontend/scripts/check-recommendation-entrypoints.mjs
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(frontend, 'package.json'));
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-entrypoints-'));
const output = join(temporary, 'entrypoints.mjs');
const realReact = require.resolve('react');
const realRouter = require.resolve('react-router-dom');
const serviceNames = ['readyBuildsService', 'buildRecommendationService', 'upgradeService', 'upgradeRoadmapService', 'savedBuildsService', 'usageProfilesService'];

try {
  await build({
    stdin: {
      resolveDir: frontend, loader: 'jsx', contents: `
        export { default as React } from 'react';
        export { renderToStaticMarkup } from 'react-dom/server';
        export { MemoryRouter } from 'react-router-dom';
        export { default as RecommendationCard, SuggestedPiecePicker } from './src/components/recommendations/RecommendationCard.jsx';
        export { default as ReadyBuilds, ReadyBuildCard, ReadyBuildDetails, RecommendationResultCard } from './src/pages/ReadyBuilds.jsx';
        export { default as BuildWizard } from './src/pages/BuildWizard.jsx';
        export { default as UpgradeSuggestions, UpgradeRoadmap } from './src/pages/UpgradeSuggestions.jsx';
      `
    },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'isolated-page-fixtures', setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react-proxy', namespace: 'fixture' }));
      builder.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router-proxy', namespace: 'fixture' }));
      builder.onResolve({ filter: /\/hooks\/useBuildState\.jsx$/ }, () => ({ path: 'build-fixture', namespace: 'fixture' }));
      builder.onResolve({ filter: /\/hooks\/useComponents\.js$/ }, () => ({ path: 'catalog-fixture', namespace: 'fixture' }));
      builder.onResolve({ filter: new RegExp(`/services/(${serviceNames.join('|')})\\.js$`) }, (args) => ({ path: args.path.split('/').pop().replace('.js', ''), namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => {
        let contents;
        if (path === 'react-proxy') contents = `import * as Real from ${JSON.stringify(realReact)}; export * from ${JSON.stringify(realReact)}; export default Real.default; ${['useState', 'useRef', 'useMemo', 'useCallback', 'useEffect'].map(name => `export const ${name} = (...args) => globalThis.__entryHooks ? globalThis.__entryHooks.${name}(...args) : Real.${name}(...args);`).join('\n')}`;
        else if (path === 'router-proxy') contents = `export * from ${JSON.stringify(realRouter)}; export const useNavigate = () => globalThis.__entryFixtures.navigate; export const useSearchParams = () => [new URLSearchParams(), () => {}];`;
        else if (path === 'build-fixture') contents = 'export const useBuildState = () => globalThis.__entryFixtures.build;';
        else if (path === 'catalog-fixture') contents = `export const useComponents = () => globalThis.__entryFixtures.catalog; export const ComponentsProvider = ({children}) => children; export const useCatalogComponent = component => ({component: globalThis.__entryFixtures.catalog.componentMap[typeof component === 'string' ? component : component?.id], loading:false, error:''});`;
        else contents = `export const ${path} = new Proxy({}, {get: (_, key) => globalThis.__entryFixtures.services.${path}[key]});`;
        return { contents, resolveDir: frontend, loader: 'js' };
      });
      builder.onLoad({ filter: /\/pages\/(ReadyBuilds|UpgradeSuggestions)\.jsx$/ }, async ({ path }) => ({
        contents: await readFile(path, 'utf8') + (path.endsWith('/ReadyBuilds.jsx') ? '\nexport { ReadyBuildCard, ReadyBuildDetails, RecommendationResultCard };' : '\nexport { UpgradeRoadmap };'), loader: 'jsx'
      }));
    }}]
  });
  const modules = await import(pathToFileURL(output).href);
  const { React, renderToStaticMarkup, MemoryRouter, RecommendationCard, SuggestedPiecePicker, ReadyBuilds, BuildWizard, UpgradeSuggestions } = modules;
  const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
  const part = (type, suffix = 'old') => ({ id: `${type}-${suffix}`, name: `${type} ${suffix}`, category: type, price: 100 });
  const selected = Object.fromEntries(types.map(type => [type, part(type)]));
  selected.cooler = part('cooler');
  selected.fans = [{ ...part('fan'), quantity: 3 }];
  const suggested = { ...selected, gpu: part('gpu', 'new'), cooler: part('cooler', 'new'), fans: [{ ...part('fan', 'new'), quantity: 2 }] };
  const readyBuild = { id: 'ready-1', name: 'Build pronta', components: suggested, targetBudgetRange: { min: 1000, max: 5000 }, usageProfile: 'gaming', limitations: [] };
  let fixtures;
  function reset() {
    const calls = [];
    const actions = Object.fromEntries(['replaceComponent', 'applyRecommendation', 'setBudget', 'setUsageType', 'setWizardStep', 'setResult'].map(name => [name, (...args) => calls.push({ name, args })]));
    fixtures = {
      calls, paths: [], navigate: (...args) => fixtures.paths.push(args),
      build: { revision: 7, selectedComponents: selected, budget: { amount: 5000, currency: 'BRL', priority: 'cost-benefit' }, usageType: 'gaming', game: {}, buildPayload: {}, wizardStep: 'review', actions, totalPrice: 1100, recommendation: { components: suggested, totalEstimatedPrice: 1000 } },
      catalog: { components: Object.values(selected).flat().concat(Object.values(suggested).flat()), componentMap: {}, byType: {}, loading: false, error: '', reload() {} },
      services: { readyBuildsService: { list: async () => [readyBuild] }, buildRecommendationService: { byBudgetRange: async () => [{ components: suggested }] }, upgradeService: { suggest: async () => ({ suggestions: [{ componentType: 'gpu', suggestedComponent: suggested.gpu }] }) }, upgradeRoadmapService: { generate: async () => ({ steps: [{ componentType: 'cpu', suggestedComponent: part('cpu', 'new') }, { componentType: 'gpu', suggestedComponent: suggested.gpu }] }) }, savedBuildsService: { list: async () => [] }, usageProfilesService: { list: async () => [] } }
    };
    fixtures.catalog.componentMap = Object.fromEntries(fixtures.catalog.components.map(component => [component.id, component]));
    globalThis.__entryFixtures = fixtures;
    globalThis.document = { querySelector: () => null };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  }
  const childrenText = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(childrenText).join('') : node?.props ? childrenText(node.props.children) : '';
  function all(node, predicate) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(item => all(item, predicate));
    return [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  }
  const named = (tree, name) => all(tree, node => node.type?.name === name);
  function button(tree, label) {
    const result = named(tree, 'Button').find(node => childrenText(node).trim() === label);
    assert(result, `Missing button: ${label}`);
    return result;
  }
  const input = (tree, label) => all(tree, node => node.props?.label === label)[0];
  const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
  const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
  // A small hook scheduler exercises page handlers and async request ownership.
  // It intentionally does not claim DOM, layout, focus, routing or browser coverage.
  function runtime(Component, getProps = () => ({})) {
    const slots = [];
    let index = 0;
    let effects = [];
    const unchanged = (a, b) => a && b && a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
    const hooks = {
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
      useRef(initial) { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
      useMemo(callback, deps) { const i = index++; if (!unchanged(slots[i]?.deps, deps)) slots[i] = { deps, value: callback() }; return slots[i].value; },
      useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
      useEffect(callback, deps) { const i = index++; if (!unchanged(slots[i]?.deps, deps)) { const previous = slots[i]; slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = callback(); }); } }
    };
    return {
      render() { index = 0; effects = []; globalThis.__entryHooks = hooks; let tree; try { tree = Component(getProps()); } finally { delete globalThis.__entryHooks; } effects.forEach(effect => effect()); return tree; },
      close() { slots.forEach(slot => slot?.cleanup?.()); }
    };
  }

  reset();
  const markup = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(RecommendationCard, { recommendation: { components: suggested, totalEstimatedPrice: 1000 }, currentComponents: selected, onApply() {}, onPreview() {} })));
  assert(markup.includes('Usar recomendação inteira'));
  assert(markup.includes('Pré-visualizar esta peça'));
  assert(markup.includes('value="gpu"'));
  assert(markup.includes('value="cooler"'));
  assert(!markup.includes('value="cpu"'));
  assert(!markup.includes('value="fans"'));
  assert(markup.includes('packs e quantidades de ventoinhas'));
  console.log('PASS: rendered recommendation distinguishes whole-build and individual paths, excludes unchanged parts and fan packs');

  let pickerProps = { components: suggested, currentComponents: selected, onPreview: (...args) => fixtures.calls.push({ name: 'preview', args }) };
  const picker = runtime(SuggestedPiecePicker, () => pickerProps);
  let tree = picker.render();
  assert(button(tree, 'Pré-visualizar esta peça').props.disabled);
  input(tree, 'Peça sugerida para substituir').props.onChange({ target: { value: 'gpu' } });
  tree = picker.render();
  button(tree, 'Pré-visualizar esta peça').props.onClick();
  assert.deepEqual(fixtures.calls, [{ name: 'preview', args: ['gpu', suggested.gpu] }]);
  pickerProps = { ...pickerProps, components: selected };
  tree = picker.render();
  assert(!named(tree, 'Button').length, 'stale choice must not survive changed suggestions');
  picker.close();
  let applied;
  tree = RecommendationCard({ recommendation: { components: suggested }, onApply: value => { applied = value; }, onPreview: pickerProps.onPreview });
  button(tree, 'Usar recomendação inteira').props.onClick();
  assert.equal(applied.components, suggested);
  assert.equal(fixtures.calls.length, 1, 'whole-build handler must not invoke single-piece preview');
  console.log('PASS: picker selection previews exactly one part; unchanged suggestions reset it; whole-build action remains separate');

  reset();
  const ready = runtime(ReadyBuilds);
  ready.render(); await tick(); tree = ready.render();
  let card = named(tree, 'ReadyBuildCard')[0];
  assert(card);
  card.props.onPreview('gpu', suggested.gpu); tree = ready.render();
  let modal = named(tree, 'ComponentReplacement')[0];
  assert.equal(modal.props.build, fixtures.build);
  assert.equal(modal.props.initialComponent, suggested.gpu);
  modal.props.onClose(); tree = ready.render();
  assert(!named(tree, 'ComponentReplacement').length);
  assert(!fixtures.calls.length, 'cancel must not change the current build');
  card.props.onPreview('gpu', suggested.gpu); tree = ready.render();
  modal = named(tree, 'ComponentReplacement')[0];
  const checkedSummary = { compatibility: { compatible: true } };
  modal.props.onApply('gpu', suggested.gpu, checkedSummary);
  assert.deepEqual(fixtures.calls[0], { name: 'replaceComponent', args: ['gpu', suggested.gpu, checkedSummary, 7] });
  assert.deepEqual(fixtures.paths[0], ['/summary']);
  fixtures.calls.length = 0;
  card.props.onDetails(); tree = ready.render();
  named(tree, 'ReadyBuildDetails')[0].props.onEdit();
  assert.equal(fixtures.calls[0].name, 'applyRecommendation');
  assert.deepEqual(fixtures.calls[0].args[0].components.fans, suggested.fans);
  assert.deepEqual(fixtures.calls[0].args[1], { replaceCooling: true });
  assert(fixtures.calls.some(call => call.name === 'setWizardStep' && call.args[0] === 'cpu'));
  assert.deepEqual(fixtures.paths.at(-1), ['/build']);
  ready.close();
  console.log('PASS: ready-build preview cancels safely, applies one checked part with revision, and explicit whole-build editing retains its cooling');

  reset();
  const wizard = runtime(BuildWizard);
  tree = wizard.render();
  named(tree, 'RecommendationCard')[0].props.onPreview('gpu', suggested.gpu); tree = wizard.render();
  modal = named(tree, 'ComponentReplacement')[0];
  fixtures.build = { ...fixtures.build, revision: 9 };
  tree = wizard.render();
  assert(!named(tree, 'ComponentReplacement').length);
  modal.props.onApply('gpu', suggested.gpu, checkedSummary);
  assert(!fixtures.calls.length, 'changed configuration must reject old modal handler');
  wizard.close();
  console.log('PASS: wizard rejects a checked modal callback after the build revision changes');

  reset();
  const obsolete = deferred();
  fixtures.services.upgradeService.suggest = () => obsolete.promise;
  const upgrades = runtime(UpgradeSuggestions);
  upgrades.render(); await tick(); tree = upgrades.render();
  const pending = button(tree, 'Gerar sugestões').props.onClick();
  fixtures.build = { ...fixtures.build, revision: 8 }; upgrades.render();
  obsolete.resolve({ suggestions: [{ componentType: 'gpu', suggestedComponent: suggested.gpu }] });
  await pending; tree = upgrades.render();
  assert(!named(tree, 'Button').some(node => childrenText(node) === 'Pré-visualizar esta peça na build atual'));
  fixtures.services.upgradeService.suggest = async () => ({ suggestions: [{ componentType: 'gpu', suggestedComponent: suggested.gpu }] });
  await button(tree, 'Gerar sugestões').props.onClick(); tree = upgrades.render();
  button(tree, 'Pré-visualizar esta peça na build atual').props.onClick(); tree = upgrades.render();
  modal = named(tree, 'ComponentReplacement')[0];
  assert.equal(modal.props.build, fixtures.build);
  modal.props.onApply('gpu', suggested.gpu, checkedSummary);
  assert.deepEqual(fixtures.calls[0], { name: 'replaceComponent', args: ['gpu', suggested.gpu, checkedSummary, 8] });
  upgrades.close();
  console.log('PASS: late upgrade response is ignored after a build change; a current suggestion previews and applies only its checked part');

  reset();
  const roadmap = runtime(UpgradeSuggestions);
  tree = roadmap.render(); await tick(); tree = roadmap.render();
  await button(tree, 'Gerar plano de upgrades').props.onClick(); tree = roadmap.render();
  const roadmapCard = named(tree, 'UpgradeRoadmap')[0];
  const secondStep = roadmapCard.props.result.steps[1];
  roadmapCard.props.onPreview(secondStep); tree = roadmap.render();
  modal = named(tree, 'ComponentReplacement')[0];
  assert.equal(modal.props.type, 'gpu');
  assert.equal(modal.props.build.selectedComponents.cpu, selected.cpu);
  assert(!fixtures.calls.length, 'earlier roadmap steps must not apply automatically');
  roadmap.close();
  console.log('PASS: previewing a later roadmap step preserves the original CPU and does not apply preceding steps');

  reset();
  const staleBudget = deferred();
  fixtures.services.buildRecommendationService.byBudgetRange = () => staleBudget.promise;
  const budgets = runtime(ReadyBuilds);
  tree = budgets.render(); await tick(); tree = budgets.render();
  input(tree, 'Orçamento mínimo').props.onChange({ target: { value: '1000' } });
  input(tree, 'Orçamento máximo').props.onChange({ target: { value: '5000' } });
  tree = budgets.render();
  const submit = all(tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  input(tree, 'Orçamento máximo').props.onChange({ target: { value: '6000' } }); budgets.render();
  input(tree, 'Orçamento máximo').props.onChange({ target: { value: '5000' } }); budgets.render();
  staleBudget.resolve([{ components: suggested }]); await submit; tree = budgets.render();
  assert(!named(tree, 'RecommendationResultCard').length, 'A→B→A criteria changes must not resurrect the old response');
  budgets.close();
  console.log('PASS: changed-and-restored budget criteria reject the obsolete recommendation response');
  reset();
  const duplicateBudget = deferred(); let submitted = 0;
  fixtures.services.buildRecommendationService.byBudgetRange = () => { submitted++; return duplicateBudget.promise; };
  const doubleClick = runtime(ReadyBuilds);
  tree = doubleClick.render(); await tick(); tree = doubleClick.render();
  input(tree, 'Orçamento mínimo').props.onChange({ target: { value: '1000' } });
  input(tree, 'Orçamento máximo').props.onChange({ target: { value: '5000' } });
  tree = doubleClick.render();
  const form = all(tree, node => node.type === 'form')[0];
  const accepted = form.props.onSubmit({ preventDefault() {} });
  const skipped = form.props.onSubmit({ preventDefault() {} });
  assert.equal(submitted, 1);
  duplicateBudget.resolve([{ components: suggested }]); await accepted; await skipped;
  tree = doubleClick.render();
  assert.equal(named(tree, 'RecommendationResultCard').length, 1, 'Skipped submit must not invalidate accepted recommendation');
  doubleClick.close();
  console.log('PASS: actual ReadyBuilds duplicate submit calls API once and retains accepted recommendation');
  console.log('LIMITATION: isolated handlers and SSR do not verify DOM events, native dialogs, history, layout, focus, scrolling, or browser persistence');
} finally {
  delete globalThis.__entryHooks;
  delete globalThis.__entryFixtures;
  await rm(temporary, { recursive: true, force: true });
}
