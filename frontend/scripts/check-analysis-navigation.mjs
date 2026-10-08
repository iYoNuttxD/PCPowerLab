// Real page functions, SSR, and controlled hooks/services with tab-session storage.
// This is not a browser history/DOM/layout/network test.
// Negative control: --drop-session simulates the pre-fix remount loss and must fail.
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(frontend, 'package.json'));
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-analysis-navigation-'));
const output = join(temporary, 'checks.mjs');
const realReact = require.resolve('react');
const realRouter = require.resolve('react-router-dom');
const storage = new Map();
const prefix = 'pcpowerlab-analysis-session:';
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
const memoryStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: memoryStorage });
let groups = 0;
const pass = message => { groups += 1; console.log(`PASS ${groups}: ${message}`); };

try {
  await build({
    stdin: { resolveDir: frontend, loader: 'jsx', contents: `
      export { default as React } from 'react';
      export { renderToStaticMarkup } from 'react-dom/server';
      export { MemoryRouter } from 'react-router-dom';
      export { default as PerformanceLab } from './src/pages/PerformanceLab.jsx';
      export { default as UpgradeSuggestions } from './src/pages/UpgradeSuggestions.jsx';
      export { buildToApiPayload } from './src/utils/buildHelpers.js';
    ` },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'navigation-fixtures', setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'fixture' }));
      builder.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'fixture' }));
      builder.onResolve({ filter: /\/hooks\/use(BuildState|Components)\.(js|jsx)$/ }, args => ({ path: basename(args.path), namespace: 'fixture' }));
      builder.onResolve({ filter: /\/services\/.*Service\.js$/ }, args => ({ path: basename(args.path, '.js'), namespace: 'service' }));
      builder.onLoad({ filter: /.*/, namespace: 'service' }, ({ path }) => ({ contents: `const methods = new Map(); export const ${path} = new Proxy({}, {get: (_, method) => { if (!methods.has(method)) methods.set(method, (...args) => globalThis.__navigation.service(${JSON.stringify(path)}, method, args)); return methods.get(method); }});` }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => {
        let contents;
        if (path === 'react') contents = `import * as Real from ${JSON.stringify(realReact)}; export * from ${JSON.stringify(realReact)}; export default Real.default; ${['useState', 'useRef', 'useMemo', 'useCallback', 'useEffect'].map(name => `export const ${name} = (...args) => globalThis.__navigationHooks ? globalThis.__navigationHooks.${name}(...args) : Real.${name}(...args);`).join('\n')}`;
        else if (path === 'router') contents = `import * as Real from ${JSON.stringify(realRouter)}; export * from ${JSON.stringify(realRouter)}; export const useNavigate = () => globalThis.__navigationHooks ? globalThis.__navigation.navigate : Real.useNavigate(); export const useSearchParams = () => globalThis.__navigationHooks ? [new URLSearchParams(globalThis.__navigation.search), (next, options) => { globalThis.__navigation.search = '?' + next.toString(); globalThis.__navigation.routeWrites.push({search:globalThis.__navigation.search,options}); }] : Real.useSearchParams();`;
        else if (path.startsWith('useBuildState')) contents = 'export const useBuildState = () => globalThis.__navigation.build;';
        else contents = 'export const useComponents = () => globalThis.__navigation.catalog; export const useCatalogComponent = component => ({component: globalThis.__navigation.catalog.componentMap[typeof component === "string" ? component : component?.id], loading:false, error:""});';
        return { contents, resolveDir: frontend };
      });
    }}]
  });
  const { React, renderToStaticMarkup, MemoryRouter, PerformanceLab, UpgradeSuggestions, buildToApiPayload } = await import(pathToFileURL(output).href);
  const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
  const part = (type, suffix) => ({ id: `${type}-${suffix}`, name: `${type} ${suffix}`, category: type, price: 100 });
  const selection = suffix => ({ ...Object.fromEntries(types.map(type => [type, part(type, suffix)])), cooler: part('cooler', suffix), fans: [{ ...part('fan', suffix), quantity: 2 }] });
  const savedFixtures = () => [
    { id: 'saved-a', name: 'Build A', revision: 3, components: buildToApiPayload(selection('a')) },
    { id: 'saved-b /ç?', name: 'Build B', revision: 9, components: buildToApiPayload(selection('b')) }
  ];
  const games = ['game-counter-strike-2', 'game-cyberpunk-2077', 'game-valorant'].map(id => ({ id, name: id, category: 'Ação' }));
  const software = ['software-adobe-premiere-pro', 'software-blender'].map(id => ({ id, name: id, category: 'Criação' }));
  const gameResult = label => ({ game: label, estimatedFps: 72, targetResolution: '1080p', qualityPreset: 'high' });
  const comparisonResult = label => ({ targetResolution: '1080p', qualityPreset: 'high', results: [gameResult(label), gameResult('Second game')] });
  const suggestionResult = () => ({ summary: 'Suggestion complete', suggestions: [{ componentType: 'gpu', currentComponent: part('gpu', 'a'), suggestedComponent: part('gpu', 'new'), reason: 'GPU para gaming', expectedImpact: 'high', estimatedUpgradeCost: 1699.8 }] });
  const roadmapResult = () => ({ summary: 'Custo acumulado estimado de R$ 1699.8 e saldo aproximado de R$ 800.2.', totalBudget: 2500, totalEstimatedCost: 1699.8, remainingBudget: 800.2,
    steps: [{ step: 1, componentType: 'gpu', currentComponent: part('gpu', 'a'), suggestedComponent: part('gpu', 'new'), reason: 'GPU para gaming', expectedImpact: 'high', priority: 'high', estimatedCost: 1699.8, cumulativeCost: 1699.8 }] });
  const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
  const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  let fixture;
  function reset(search = '') {
    storage.clear();
    const current = selection('current');
    const allParts = [current, selection('a'), selection('b')].flatMap(value => Object.values(value).flat());
    fixture = {
      search, calls: [], actions: [], routeWrites: [], saved: savedFixtures(), handlers: {},
      navigate: (...args) => fixture.calls.push({ name: 'navigate', args }),
      build: { revision: 7, selectedComponents: current, buildPayload: buildToApiPayload(current), usageType: 'gaming', budget: { amount: 5000 }, game: {gameId:'game-valorant',targetResolution:'1440p',qualityPreset:'high'}, actions: new Proxy({}, { get: (_, name) => (...args) => fixture.actions.push({ name, args }) }) },
      catalog: { components: allParts, componentMap: Object.fromEntries(allParts.map(component => [component.id, component])), loading: false, error: '', reload() {} },
      service(name, method, args) {
        const handler = fixture.handlers[`${name}.${method}`];
        if (handler) return handler(...args);
        if (name === 'savedBuildsService' && method === 'list') return Promise.resolve(fixture.saved);
        if (name === 'performanceService' && method === 'listGames') return Promise.resolve(games);
        if (name === 'professionalSoftwareService' && method === 'list') return Promise.resolve(software);
        if (method === 'list') return Promise.resolve([]);
        fixture.calls.push({ name, method, args });
        if (name === 'performanceService') return Promise.resolve(gameResult('Game complete'));
        if (name === 'gameComparisonService') return Promise.resolve(comparisonResult('Comparison complete'));
        if (name === 'professionalSoftwareService') return Promise.resolve({software:'Software complete',performanceScore:90,category:'Criação'});
        if (name === 'upgradeService') return Promise.resolve(suggestionResult());
        if (name === 'upgradeRoadmapService') return Promise.resolve(roadmapResult());
        throw new Error(`Unexpected ${name}.${method}`);
      }
    };
    globalThis.__navigation = fixture;
  }
  const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  const label = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(label).join('') : node?.props ? label(node.props.children) : '';
  const named = (tree, name) => all(tree, node => node.type?.name === name);
  const button = (tree, text) => { const found = named(tree, 'Button').find(node => label(node).trim() === text); assert(found, `Missing button: ${text}`); return found; };
  const field = (tree, text) => { const found = all(tree, node => node.props?.label === text)[0]; assert(found, `Missing field: ${text}`); return found; };
  const change = (page, text, value) => { field(page.render(), text).props.onChange({ target: { value } }); return page.render(); };
  const setMode = (page, mode) => { all(page.render(), node => node.type === 'input' && node.props.type === 'radio' && node.props.value === mode)[0].props.onChange(); return page.render(); };
  const hasGames = tree => named(tree, 'GameSimulationResult').length + named(tree, 'GameComparisonResult').length;
  const hasSoftware = tree => Boolean(named(tree, 'SoftwareResult')[0].props.result);
  const hasRoadmap = tree => Boolean(named(tree, 'UpgradeRoadmap').length);
  const hasSuggestions = tree => named(tree, 'Alert').some(node => node.props.title === 'Resultado de upgrade');
  const render = tree => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/upgrades' + fixture.search] }, tree));
  function runtime(Component) {
    const slots = []; let index = 0, effects = [], dirty = false, closed = false, writesAfterClose = 0;
    const same = (a, b) => a && b && a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
    const hooks = {
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { if (closed) writesAfterClose += 1; const value = typeof next === 'function' ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; } }]; },
      useRef(initial) { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
      useMemo(callback, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: callback() }; return slots[i].value; },
      useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
      useEffect(callback, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) { const previous = slots[i]; slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = callback(); }); } }
    };
    return {
      render() { assert(!closed); let tree, cycles = 0; do { assert(cycles++ < 30, 'Hook scheduler did not settle'); index = 0; effects = []; dirty = false; globalThis.__navigationHooks = hooks; try { tree = Component(); } finally { delete globalThis.__navigationHooks; } effects.forEach(effect => effect()); } while (dirty); return tree; },
      close() { slots.forEach(slot => slot?.cleanup?.()); closed = true; if (process.argv.includes('--drop-session')) storage.clear(); },
      get writesAfterClose() { return writesAfterClose; }
    };
  }
  async function load(Component) { const page = runtime(Component); page.render(); await tick(); page.render(); return page; }
  async function run(page, text) { await button(page.render(), text).props.onClick(); return page.render(); }
  const changeCatalogPrice = () => {
    fixture.catalog.components = fixture.catalog.components.map(part => part.id === 'gpu-a' ? { ...part, price: 999 } : part);
    fixture.catalog.componentMap = Object.fromEntries(fixture.catalog.components.map(part => [part.id, part]));
  };

  reset();
  let page = await load(PerformanceLab);
  setMode(page, 'compare'); change(page, 'Resolução', '1080p'); change(page, 'Qualidade gráfica', 'ultra'); change(page, 'Software', 'software-blender');
  await run(page, 'Comparar jogos'); await run(page, 'Simular software');
  assert.equal(hasGames(page.render()), 1); assert(hasSoftware(page.render())); page.close();
  const untouchedBuild = structuredClone({revision:fixture.build.revision,selectedComponents:fixture.build.selectedComponents,game:fixture.build.game});
  const other = await load(UpgradeSuggestions); other.close();
  page = runtime(PerformanceLab); let tree = page.render();
  assert.equal(hasGames(tree), 0, 'Do not restore before catalogs are revalidated');
  assert.equal(hasSoftware(tree), false);
  await tick(); tree = page.render();
  assert.equal(all(tree, node => node.type === 'input' && node.props.value === 'compare')[0].props.checked, true);
  assert.equal(field(tree, 'Resolução').props.value, '1080p'); assert.equal(field(tree, 'Qualidade gráfica').props.value, 'ultra');
  assert.equal(field(tree, 'Software').props.value, 'software-blender'); assert.equal(hasGames(tree), 1); assert(hasSoftware(tree));
  assert.equal(fixture.calls.length, 2, 'Returning must not send duplicate simulation requests');
  assert.deepEqual({revision:fixture.build.revision,selectedComponents:fixture.build.selectedComponents,game:fixture.build.game}, untouchedBuild);
  assert.deepEqual(fixture.actions, []);
  pass('Performance Lab → Upgrades → Performance Lab restores compare mode, 1080p, quality, software and both exact results after catalog checks');

  change(page, 'Resolução', '4k'); tree = change(page, 'Resolução', '1080p'); assert.equal(hasGames(tree), 0); assert(hasSoftware(tree));
  await run(page, 'Comparar jogos'); change(page, 'Software', 'software-adobe-premiere-pro'); tree = change(page, 'Software', 'software-blender');
  assert.equal(hasSoftware(tree), false); assert.equal(hasGames(tree), 1); page.close();
  page = await load(PerformanceLab); assert.equal(hasSoftware(page.render()), false); assert.equal(hasGames(page.render()), 1); page.close();
  pass('A→B→A settings discard obsolete success; game and software scopes invalidate independently across remounts');

  for (const [name, mutate] of [
    ['revision', () => {fixture.build.revision += 1;}],
    ['component', () => {fixture.build.selectedComponents.cpu = part('cpu', 'other');}],
    ['fan quantity', () => {fixture.build.selectedComponents.fans[0].quantity += 1;}],
    ['component price', () => {fixture.build.selectedComponents.gpu.price += 1;}]
  ]) {
    reset(); page = await load(PerformanceLab); change(page, 'Resolução', '1080p'); await run(page, 'Simular jogo'); page.close(); mutate();
    page = await load(PerformanceLab); tree = page.render(); assert.equal(hasGames(tree), 0, name); assert.equal(field(tree, 'Resolução').props.value, '1440p', name); page.close();
  }
  pass('Changed build revision, component, fan count or price rejects both stored inputs and results on remount');

  for (const kind of ['game', 'software']) {
    reset(); page = await load(PerformanceLab); const action = kind === 'game' ? 'Simular jogo' : 'Simular software';
    await run(page, action); const pending = deferred(); const service = kind === 'game' ? 'performanceService.simulateGame' : 'professionalSoftwareService.simulate'; fixture.handlers[service] = () => pending.promise;
    const request = button(page.render(), action).props.onClick(); page.close(); // No intervening render: retry must synchronously remove old success.
    pending.resolve(kind === 'game' ? gameResult('LATE') : {software:'LATE',performanceScore:50}); await request;
    assert.equal(page.writesAfterClose, 0); page = await load(PerformanceLab); tree = page.render(); assert.equal(kind === 'game' ? hasGames(tree) : Number(hasSoftware(tree)), 0); assert(!render(tree).includes('LATE')); page.close();
    reset(); page = await load(PerformanceLab); fixture.handlers[service] = async () => {throw new Error('TRANSIENT ERROR');}; await run(page, action); assert(render(page.render()).includes('TRANSIENT ERROR')); page.close();
    page = await load(PerformanceLab); assert(!render(page.render()).includes('TRANSIENT ERROR')); assert(!button(page.render(), action).props.loading); page.close();
  }
  pass('Interrupted retries synchronously discard old success; late responses, loading and errors never resurrect for games or software');

  reset(); page = await load(PerformanceLab); change(page, 'Jogo', 'game-counter-strike-2'); await run(page, 'Simular jogo'); page.close();
  fixture.handlers['performanceService.listGames'] = async () => games.slice(1); page = await load(PerformanceLab); assert.equal(hasGames(page.render()), 0); assert.equal(field(page.render(), 'Jogo').props.value, 'game-cyberpunk-2077'); page.close();
  pass('Removed catalog options replace obsolete selection and reject the old result');

  reset('?buildId=saved-a'); page = await load(UpgradeSuggestions);
  change(page, 'Orçamento para upgrade', '1850'); change(page, 'Orçamento total', '3300'); change(page, 'Número máximo de etapas', '4'); change(page, 'Tipo de uso', 'work'); change(page, 'Prioridade', 'performance');
  await run(page, 'Gerar sugestões'); await run(page, 'Gerar plano de upgrades'); tree = page.render();
  const html = render(tree).replace(/\u00a0/g, ' ');
  assert(html.includes('R$ 1.699,80 e saldo aproximado de R$ 800,20.'), 'Roadmap sentence currency must be BRL, including sentence-final amount');
  assert(html.includes('Impacto esperado: Alto')); assert(html.includes('Prioridade: Alto')); assert(!html.includes('R$ 1699.8')); assert(!html.includes('R$ 800.2')); page.close();
  fixture.search = ''; const pendingSaved = deferred(); fixture.handlers['savedBuildsService.list'] = () => pendingSaved.promise;
  page = runtime(UpgradeSuggestions); tree = page.render(); assert.equal(field(tree, 'Build salva').props.value, 'saved-a'); assert.equal(hasSuggestions(tree), false); assert.equal(hasRoadmap(tree), false);
  assert.equal(fixture.search, '?buildId=saved-a'); assert.equal(fixture.routeWrites.at(-1).options.replace, true);
  pendingSaved.resolve(fixture.saved); await tick(); tree = page.render();
  assert(hasSuggestions(tree)); assert(hasRoadmap(tree)); assert.equal(field(tree, 'Orçamento para upgrade').props.value, '1850'); assert.equal(field(tree, 'Orçamento total').props.value, '3300');
  assert.equal(field(tree, 'Número máximo de etapas').props.value, '4'); assert.equal(field(tree, 'Tipo de uso').props.value, 'work'); assert.equal(field(tree, 'Prioridade').props.value, 'performance');
  assert.equal(fixture.calls.length, 2); assert.deepEqual(fixture.actions, []); page.close();
  pass('Saved upgrade source, independent budgets/settings and both results restore after saved-source validation; roadmap BRL sentences and metric labels render correctly');

  fixture.search = '?source=current'; page = await load(UpgradeSuggestions); tree = page.render(); assert.equal(field(tree, 'Build salva').props.value, ''); assert.equal(hasSuggestions(tree), false); assert.equal(hasRoadmap(tree), false); assert.equal(field(tree, 'Orçamento para upgrade').props.value, 1500);
  change(page, 'Build salva', 'saved-a'); await run(page, 'Gerar sugestões'); fixture.search = '?source=current'; tree = page.render(); assert.equal(field(tree, 'Build salva').props.value, ''); assert.equal(hasSuggestions(tree), false);
  fixture.search = '?buildId=saved-a'; tree = page.render(); assert.equal(field(tree, 'Build salva').props.value, 'saved-a'); assert.equal(hasSuggestions(tree), false); page.close();
  pass('Explicit current URL and changed saved URLs override session state; simulated Back/Forward source transitions cannot resurrect old results');

  for (const [name, mutate] of [
    ['saved components', () => {fixture.saved[0].components.gpuId = 'gpu-b';}],
    ['saved revision', () => {fixture.saved[0].revision += 1;}],
    ['catalog price', changeCatalogPrice],
    ['global revision', () => {fixture.build.revision += 1;}]
  ]) {
    reset('?buildId=saved-a'); page = await load(UpgradeSuggestions); change(page, 'Orçamento para upgrade', '1850'); await run(page, 'Gerar sugestões'); await run(page, 'Gerar plano de upgrades'); page.close(); mutate();
    page = await load(UpgradeSuggestions); tree = page.render(); assert.equal(hasSuggestions(tree), false, name); assert.equal(hasRoadmap(tree), false, name); assert.equal(field(tree, 'Orçamento para upgrade').props.value, 1500, name); page.close();
  }
  pass('Saved component/revision changes, current catalog prices and global build revision invalidate cached upgrade inputs and both results');

  reset('?buildId=saved-a'); page = await load(UpgradeSuggestions); await run(page, 'Gerar sugestões'); await run(page, 'Gerar plano de upgrades');
  change(page, 'Orçamento para upgrade', '1700'); tree = change(page, 'Orçamento para upgrade', 1500); assert.equal(hasSuggestions(tree), false); assert(hasRoadmap(tree));
  await run(page, 'Gerar sugestões'); change(page, 'Número máximo de etapas', 4); tree = change(page, 'Número máximo de etapas', 3); assert(hasSuggestions(tree)); assert.equal(hasRoadmap(tree), false);
  await run(page, 'Gerar plano de upgrades'); change(page, 'Prioridade', 'performance'); tree = change(page, 'Prioridade', 'cost-benefit'); assert.equal(hasSuggestions(tree), false); assert.equal(hasRoadmap(tree), false); page.close();
  page = await load(UpgradeSuggestions); assert.equal(hasSuggestions(page.render()), false); assert.equal(hasRoadmap(page.render()), false); page.close();
  pass('Upgrade budget and roadmap settings invalidate only their own result; shared priority changes clear both without A→B→A resurrection');

  for (const [action, service, result] of [['Gerar sugestões', 'upgradeService.suggest', suggestionResult], ['Gerar plano de upgrades', 'upgradeRoadmapService.generate', roadmapResult]]) {
    reset('?buildId=saved-a'); page = await load(UpgradeSuggestions); await run(page, action); const pending = deferred(); fixture.handlers[service] = () => pending.promise;
    const request = button(page.render(), action).props.onClick(); page.close(); pending.resolve(result()); await request; assert.equal(page.writesAfterClose, 0);
    page = await load(UpgradeSuggestions); assert.equal(hasSuggestions(page.render()), false); assert.equal(hasRoadmap(page.render()), false); page.close();
    reset('?buildId=saved-a'); page = await load(UpgradeSuggestions); fixture.handlers[service] = async () => {throw new Error('UPGRADE ERROR');}; await run(page, action); assert(render(page.render()).includes('UPGRADE ERROR')); page.close();
    page = await load(UpgradeSuggestions); assert(!render(page.render()).includes('UPGRADE ERROR')); assert(!button(page.render(), action).props.loading); page.close();
  }
  pass('Upgrade and roadmap retries discard former success before navigation; late responses and errors never survive remount');

  for (const missing of [true, false]) {
    reset('?buildId=saved-a'); page = await load(UpgradeSuggestions); await run(page, 'Gerar sugestões'); await run(page, 'Gerar plano de upgrades'); page.close();
    if (missing) fixture.saved = [];
    else fixture.handlers['savedBuildsService.list'] = async () => {throw new Error('SOURCE OFFLINE');};
    page = await load(UpgradeSuggestions); tree = page.render(); assert.equal(field(tree, 'Build salva').props.value, 'saved-a'); assert.equal(hasSuggestions(tree), false); assert.equal(hasRoadmap(tree), false); assert(button(tree, 'Gerar sugestões').props.disabled); page.close();
    fixture.saved = savedFixtures(); delete fixture.handlers['savedBuildsService.list']; page = await load(UpgradeSuggestions); assert.equal(hasSuggestions(page.render()), false); assert.equal(hasRoadmap(page.render()), false); page.close();
  }
  pass('Missing/failed saved-source resolution stays selected and blocked; later recovery cannot revive discarded results');

  reset('?buildId=saved-a'); page = await load(UpgradeSuggestions); await run(page, 'Gerar sugestões'); page.close();
  fixture.catalog.loading = true; page = runtime(UpgradeSuggestions); tree = page.render();
  assert.equal(hasSuggestions(tree), false); assert(button(tree, 'Gerar sugestões').props.disabled); assert(render(tree).includes('Atualizando o catálogo'));
  await tick(); fixture.catalog.loading = false; tree = page.render(); assert(hasSuggestions(tree)); page.close();
  fixture.catalog.error = 'Catalog offline'; page = await load(UpgradeSuggestions); tree = page.render();
  assert.equal(hasSuggestions(tree), false); assert(button(tree, 'Gerar sugestões').props.disabled); assert(render(tree).includes('Não foi possível atualizar o catálogo')); page.close();
  fixture.catalog.error = ''; page = await load(UpgradeSuggestions); assert.equal(hasSuggestions(page.render()), false); page.close();
  pass('Catalog loading delays restoration and explains disabled actions; catalog failure clears saved results and offers retry');

  for (const [Component, resultSlot, corrupt] of [
    [PerformanceLab, 'performance-games', value => ({...value, summary:{bad:'text'}})],
    [UpgradeSuggestions, 'upgrade-suggestions', value => ({...value,data:{...value.data,suggestions:{bad:'array'}}})],
    [UpgradeSuggestions, 'upgrade-roadmap', value => ({...value,data:{...value.data,steps:[{componentType:'gpu',suggestedComponent:{id:'gpu-new',name:{bad:'text'}}}]}})]
  ]) {
    reset('?source=current'); page = await load(Component); await run(page, Component === PerformanceLab ? 'Simular jogo' : resultSlot === 'upgrade-roadmap' ? 'Gerar plano de upgrades' : 'Gerar sugestões'); page.close();
    const key = prefix + resultSlot; const entry = JSON.parse(storage.get(key)); entry.value = corrupt(entry.value); storage.set(key, JSON.stringify(entry));
    page = await load(Component); tree = page.render(); assert.doesNotThrow(() => render(tree)); assert.equal(Component === PerformanceLab ? hasGames(tree) : Number(hasSuggestions(tree) || hasRoadmap(tree)), 0); page.close();
  }
  pass('Result schema validation rejects malformed display fields and collection/component shapes before rendering');

  for (const [name, corrupt] of [
    ['invalid JSON', () => '{bad'], ['wrong schema', text => JSON.stringify({...JSON.parse(text),version:999})],
    ['wrong identity', text => JSON.stringify({...JSON.parse(text),identity:'another-build'})],
    ['expired', text => JSON.stringify({...JSON.parse(text),savedAt:0})],
    ['future timestamp', text => JSON.stringify({...JSON.parse(text),savedAt:Date.now()+60000})],
    ['wrong input shape', text => JSON.stringify({...JSON.parse(text),value:{mode:'compare',selectedGameIds:'bad'}})],
    ['oversized', () => 'x'.repeat(400*1024)]
  ]) {
    reset(); page = await load(PerformanceLab); change(page, 'Resolução', '1080p'); await run(page, 'Simular jogo'); page.close();
    for (const key of [...storage.keys()]) storage.set(key, corrupt(storage.get(key)));
    page = await load(PerformanceLab); tree = page.render(); assert.equal(field(tree, 'Resolução').props.value, '1440p', name); assert.equal(hasGames(tree), 0, name); page.close();
  }
  pass('Corrupt JSON, schema, identity, shape, age, future timestamps and oversized session records fall back safely');

  reset(); Object.defineProperty(globalThis, 'sessionStorage', { configurable:true, get() {throw new Error('Storage denied');} });
  page = await load(PerformanceLab); change(page, 'Resolução', '1080p'); await run(page, 'Simular jogo'); assert.equal(hasGames(page.render()), 1); page.close(); page = await load(PerformanceLab); assert.equal(field(page.render(), 'Resolução').props.value, '1440p'); page.close();
  page = await load(UpgradeSuggestions); await run(page, 'Gerar sugestões'); assert(hasSuggestions(page.render())); page.close();
  pass('Denied storage never blocks analysis; remount gracefully falls back to default inputs without cached state');
  console.log(`SUMMARY: ${groups} navigation/session scenario groups passed against actual pages and hook source`);
  console.log('LIMITATION: hook/SSR and controlled route-state transitions; no browser history events, live HTTP, DOM, layout or real Chrome verification');
} finally {
  if (originalStorage) Object.defineProperty(globalThis, 'sessionStorage', originalStorage); else delete globalThis.sessionStorage;
  delete globalThis.__navigationHooks; delete globalThis.__navigation;
  await rm(temporary, { recursive: true, force: true });
}
