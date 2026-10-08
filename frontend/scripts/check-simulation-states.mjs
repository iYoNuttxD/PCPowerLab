// Executed SSR and isolated page-handler/hook checks, with in-memory services.
// Does not launch a browser or server; no DOM, layout, focus or persistence claim.
// Run from any directory: node frontend/scripts/check-simulation-states.mjs
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(frontend, 'package.json'));
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-simulation-states-'));
const output = join(temporary, 'simulation-states.mjs');
const realReact = require.resolve('react');
const realRouter = require.resolve('react-router-dom');
const serviceNames = ['performanceService', 'gameComparisonService', 'professionalSoftwareService', 'recommendationService', 'purchaseLinksService', 'buildExportService', 'buildReportService', 'buildScoreService', 'compatibilityFixService', 'savedBuildsService', 'sharingService', 'buildComparisonService', 'budgetService', 'compatibilityService'];
let checks = 0;
let assertions = 0;
const verify = (condition, message) => { assertions += 1; assert(condition, message); };
const equal = (actual, expected, message) => { assertions += 1; assert.deepEqual(actual, expected, message); };
const pass = label => { checks += 1; console.log(`PASS ${checks}: ${label}`); };

try {
  await build({
    stdin: {
      resolveDir: frontend, loader: 'jsx', contents: `
        export { default as React } from 'react';
        export { renderToStaticMarkup } from 'react-dom/server';
        export { MemoryRouter } from 'react-router-dom';
        export { default as PerformanceLab } from './src/pages/PerformanceLab.jsx';
        export { default as BuildSummary } from './src/pages/BuildSummary.jsx';
        export { default as BuildWizard } from './src/pages/BuildWizard.jsx';
        export { default as CompareBuilds } from './src/pages/CompareBuilds.jsx';
        export { useSimulationRequest } from './src/hooks/useSimulationRequest.js';
      `
    },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'isolated-simulation-fixtures', setup(builder) {
      // Mutation controls must fail the request-ownership assertions below.
      const dropUnmount = process.argv.includes('--drop-wizard-unmount-guard');
      const dropRevision = process.argv.includes('--drop-wizard-revision-guard');
      if (dropUnmount || dropRevision) builder.onLoad({ filter: /pages\/BuildWizard\.jsx$/ }, async ({ path }) => {
        let contents = await readFile(path, 'utf8');
        if (dropUnmount) contents = contents.replace('activeRequest.current += 1;', '/* mutation: unmount ownership disabled */');
        if (dropRevision) contents = contents.replace(' && latestConfiguration.current === configurationKey', '');
        return { contents, loader: 'jsx' };
      });
      if (process.argv.includes('--drop-task-retention') || process.argv.includes('--drop-task-revision')) builder.onLoad({ filter: /pages\/PerformanceLab\.jsx$/ }, async ({ path }) => {
        let contents = await readFile(path, 'utf8');
        if (process.argv.includes('--drop-task-retention')) contents = contents.replace('analysisIdentity([identity, gameId, targetResolution, qualityPreset])', 'analysisIdentity([identity, task, gameId, targetResolution, qualityPreset])');
        if (process.argv.includes('--drop-task-revision')) contents = contents.replace('analysisIdentity([build.revision, build.selectedComponents, build.game])', 'analysisIdentity([build.selectedComponents, build.game])');
        return { contents, loader: 'jsx' };
      });
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react-proxy', namespace: 'fixture' }));
      builder.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router-proxy', namespace: 'fixture' }));
      builder.onResolve({ filter: /\/hooks\/useBuildState\.jsx$/ }, () => ({ path: 'build-fixture', namespace: 'fixture' }));
      builder.onResolve({ filter: /\/hooks\/useComponents\.js$/ }, () => ({ path: 'catalog-fixture', namespace: 'fixture' }));
      builder.onResolve({ filter: new RegExp(`/services/(${serviceNames.join('|')})\\.js$`) }, args => ({ path: args.path.split('/').pop().replace('.js', ''), namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => {
        let contents;
        if (path === 'react-proxy') contents = `import * as Real from ${JSON.stringify(realReact)}; export * from ${JSON.stringify(realReact)}; export default Real.default; ${['useState', 'useRef', 'useMemo', 'useCallback', 'useEffect'].map(name => `export const ${name} = (...args) => globalThis.__simulationHooks ? globalThis.__simulationHooks.${name}(...args) : Real.${name}(...args);`).join('\n')}`;
        else if (path === 'router-proxy') contents = `import * as Real from ${JSON.stringify(realRouter)}; export * from ${JSON.stringify(realRouter)}; export const useNavigate = () => globalThis.__simulationFixtures.navigate; export const useLocation = () => globalThis.__simulationHooks ? globalThis.__simulationFixtures.location : Real.useLocation();`;
        else if (path === 'build-fixture') contents = 'export const useBuildState = () => globalThis.__simulationFixtures.build;';
        else if (path === 'catalog-fixture') contents = `export const useComponents = () => globalThis.__simulationFixtures.catalog; export const useCatalogComponent = component => ({component: globalThis.__simulationFixtures.catalog.componentMap[typeof component === 'string' ? component : component?.id], loading:false, error:''});`;
        else contents = `export const ${path} = new Proxy({}, {get: (_, key) => globalThis.__simulationFixtures.services.${path}[key]});`;
        return { contents, resolveDir: frontend, loader: 'js' };
      });
    }}]
  });
  const { React, renderToStaticMarkup, MemoryRouter, PerformanceLab, BuildSummary, BuildWizard, CompareBuilds, useSimulationRequest } = await import(pathToFileURL(output).href);
  const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
  const catalog = Array.from({ length: 12 }, (_, index) => ({ id: `game-${index + 1}`, name: `Jogo ${index + 1}`, category: 'Ação', targetResolution: '1080p' }));
  const softwareCatalog = [1, 2].map(index => ({ id: `software-${index}`, name: `Programa ${index}`, category: 'Criação', description: `Descrição ${index}` }));
  const gameResult = (label = 'Resultado atual') => ({ game: label, targetResolution: '1440p', qualityPreset: 'ultra', estimatedFps: 72, performanceLevel: 'excellent', meetsMinimumRequirements: true, meetsRecommendedRequirements: true });
  const comparisonResult = (label = 'Comparação atual') => ({ targetResolution: '1440p', qualityPreset: 'ultra', results: [gameResult(label), gameResult('Outro resultado')] });
  const softwareResult = (label = 'Programa atual') => ({ software: label, category: 'Criação', performanceScore: 87, performanceLevel: 'excellent', meetsMinimumRequirements: true, meetsRecommendedRequirements: true });
  const apiError = (status, message, errors) => Object.assign(new Error(message), { status, ...(errors ? { errors } : {}) });
  const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
  const tick = async () => { for (let index = 0; index < 8; index += 1) await Promise.resolve(); };
  let fixtures;
  function reset(options = {}) {
    const calls = [];
    const selectedComponents = Object.fromEntries(types.map(type => [type, { id: `${type}-1`, name: type }]));
    selectedComponents.cooler = { id: 'cooler-1' };
    selectedComponents.fans = [{ id: 'fan-1', quantity: 3 }];
    const record = (name, result) => async payload => { calls.push({ name, payload }); return result(); };
    fixtures = {
      calls, navigate() {}, location: { pathname: '/summary', search: '', hash: '', key: 'summary-fixture' },
      catalog: { componentMap: Object.fromEntries(Object.values(selectedComponents).flat().map(part => [part.id, part])), byType: {}, loading: false, error: '', reload() {} },
      build: { revision: 7, selectedComponents, buildPayload: { ...Object.fromEntries(types.map(type => [`${type}Id`, `${type}-1`])), coolerId: 'cooler-1', fans: [{ fanId: 'fan-1', quantity: 3 }] }, totalPrice: 5000, budget: { amount: 6000, currency: 'BRL', priority: 'cost-benefit' }, usageType: 'gaming', game: { gameId: 'game-1', targetResolution: '1080p', qualityPreset: 'high' }, actions: new Proxy({}, { get: (_, key) => () => { throw new Error(`Unexpected persisted build action: ${String(key)}`); } }) },
      services: {
        performanceService: { listGames: async () => options.games ?? catalog, simulateGame: record('single', gameResult) },
        gameComparisonService: { compare: record('compare', comparisonResult) },
        professionalSoftwareService: { list: async () => options.software ?? softwareCatalog, simulate: record('software', softwareResult) },
        recommendationService: { summary: record('summary', () => ({ summary: 'Análises disponíveis', compatibility: { compatible: true } })) },
        purchaseLinksService: { byBuild: record('purchaseLinks', () => ({})) }
      }
    };
    globalThis.__simulationFixtures = fixtures;
  }
  const childrenText = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(childrenText).join('') : node?.props ? childrenText(node.props.children) : '';
  function all(node, predicate) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(item => all(item, predicate));
    return [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  }
  const named = (tree, name) => all(tree, node => node.type?.name === name);
  const button = (tree, label) => { const result = named(tree, 'Button').find(node => childrenText(node).trim() === label); verify(result, `Missing button: ${label}`); return result; };
  const select = (tree, label) => { const result = named(tree, 'Select').find(node => node.props.label === label); verify(result, `Missing select: ${label}`); return result; };
  const hint = tree => childrenText(all(tree, node => ['game-action-hint', 'comparison-action-hint'].includes(node.props?.id))[0]);
  const gameResults = tree => [...named(tree, 'GameSimulationResult'), ...named(tree, 'GameComparisonResult')];
  const markup = tree => renderToStaticMarkup(React.createElement(MemoryRouter, null, tree));
  const requestErrors = tree => named(tree, 'RequestError').filter(node => node.props.error);
  const setSelection = (page, label, value) => { select(page.render(), label).props.onChange({ target: { value } }); return page.render(); };
  const setMode = (page, mode) => { const tabs = named(page.render(), 'TaskTabs')[0]; verify(tabs, 'Performance task tabs exist'); tabs.props.onChange(mode); return page.render(); };
  function setGameCount(page, count) {
    const checkboxes = all(page.render(), node => node.type === 'input' && node.props.type === 'checkbox');
    checkboxes.forEach((checkbox, index) => { if (checkbox.props.checked !== (index < count)) checkbox.props.onChange(); });
    return page.render();
  }

  // Commit-like hook scheduler. Effects run after a render, including cleanup,
  // and state updates are settled before assertions. It calls the actual hook
  // and page functions, but does not implement React DOM or browser events.
  function runtime(Component, getProps = () => ({})) {
    const slots = [];
    let index = 0;
    let effects = [];
    let dirty = false;
    let closed = false;
    let writesAfterClose = 0;
    const unchanged = (a, b) => a && b && a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
    const hooks = {
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { if (closed) writesAfterClose += 1; const value = typeof next === 'function' ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; } }]; },
      useRef(initial) { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
      useMemo(callback, deps) { const i = index++; if (!unchanged(slots[i]?.deps, deps)) slots[i] = { deps, value: callback() }; return slots[i].value; },
      useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
      useEffect(callback, deps) { const i = index++; if (!unchanged(slots[i]?.deps, deps)) { const previous = slots[i]; slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = callback(); }); } }
    };
    return {
      render() {
        assert(!closed, 'Cannot render a closed runtime');
        let result;
        let cycles = 0;
        do {
          assert(cycles++ < 30, 'Hook scheduler failed to settle');
          index = 0; effects = []; dirty = false; globalThis.__simulationHooks = hooks;
          try { result = Component(getProps()); } finally { delete globalThis.__simulationHooks; }
          effects.forEach(effect => effect());
        } while (dirty);
        return result;
      },
      close() { slots.forEach(slot => slot?.cleanup?.()); closed = true; },
      get writesAfterClose() { return writesAfterClose; }
    };
  }
  async function loadedPage(Component = PerformanceLab) { const page = runtime(Component); page.render(); await tick(); page.render(); return page; }

  reset();
  let page = runtime(PerformanceLab);
  let tree = page.render();
  verify(markup(tree).includes('Carregando jogos...'));
  verify(!markup(tree).includes('Carregando softwares...'), 'Inactive software controls are absent');
  verify(markup(setMode(page, 'software')).includes('Carregando softwares...'));
  tree = setMode(page, 'single');
  verify(button(tree, 'Simular jogo').props.disabled);
  equal(hint(tree), 'Aguarde o carregamento dos jogos.');
  await button(tree, 'Simular jogo').props.onClick();
  equal(fixtures.calls.length, 0, 'Loading catalog must block direct handler invocation');
  await tick(); tree = page.render();
  equal(select(tree, 'Jogo').props.value, 'game-1');
  equal(select(setMode(page, 'software'), 'Software').props.value, 'software-1', 'Absent seeded software falls back to current catalog');
  tree = setMode(page, 'single');
  verify(!button(tree, 'Simular jogo').props.disabled);
  verify(!gameResults(tree).length);
  page.close();
  pass('loading catalogs block requests; loaded catalogs recover and select available defaults (SSR + handlers)');

  reset(); page = await loadedPage();
  setSelection(page, 'Jogo', 'game-3');
  setSelection(page, 'Resolução', '1440p');
  tree = setSelection(page, 'Qualidade gráfica', 'ultra');
  await button(tree, 'Simular jogo').props.onClick(); tree = page.render();
  equal(fixtures.calls.length, 1);
  equal(fixtures.calls[0], { name: 'single', payload: { gameId: 'game-3', targetResolution: '1440p', qualityPreset: 'ultra', build: { ...Object.fromEntries(types.map(type => [`${type}Id`, `${type}-1`])), coolerId: 'cooler-1', fans: [{ fanId: 'fan-1', quantity: 3 }] } } });
  equal(gameResults(tree).length, 1);
  verify(markup(tree).includes('Resultado atual'));
  verify(hint(tree).includes('Simulação concluída'));
  tree = setMode(page, 'compare');
  verify(!gameResults(tree).length, 'Mode changes hide the earlier single result');
  equal(select(tree, 'Resolução').props.value, '1440p');
  equal(select(tree, 'Qualidade gráfica').props.value, 'ultra');
  tree = setMode(page, 'single');
  equal(select(tree, 'Jogo').props.value, 'game-3');
  equal(gameResults(tree).length, 1, 'Returning to an unchanged task retains its success');
  equal(fixtures.calls.length, 1, 'Tabs alone do not submit requests');
  page.close();
  pass('single-game success submits current settings, seven build slots and cooling; mode changes preserve selections');

  reset(); page = await loadedPage(); setMode(page, 'compare');
  for (const count of [0, 1, 2, 10, 11, 0]) {
    tree = setGameCount(page, count);
    const allowed = count >= 2 && count <= 10;
    equal(Boolean(button(tree, 'Comparar jogos').props.disabled), !allowed, `${count} selected games action state`);
    verify(childrenText(tree).includes(`${count} jogo(s) selecionado(s)`));
    if (!allowed) equal(hint(tree), 'Selecione de 2 a 10 jogos para comparar.');
    const before = fixtures.calls.length;
    await button(tree, 'Comparar jogos').props.onClick(); tree = page.render();
    equal(fixtures.calls.length, before + Number(allowed), `${count} selected games request count`);
    if (allowed) {
      equal(fixtures.calls.at(-1).name, 'compare');
      equal(fixtures.calls.at(-1).payload.gameIds, catalog.slice(0, count).map(game => game.id));
      equal(named(tree, 'GameComparisonResult').length, 1);
    } else equal(gameResults(tree).length, 0);
  }
  page.close();
  pass('comparison boundaries: 0/1/>10 blocked even at handler level; 2 and 10 submit exactly the selected IDs');

  for (const missing of types) {
    reset(); delete fixtures.build.selectedComponents[missing]; page = await loadedPage(); tree = page.render();
    verify(markup(tree).includes('Build incompleta'));
    verify(markup(tree).includes('Ir para Montar PC'));
    verify(button(tree, 'Simular jogo').props.disabled);
    await button(tree, 'Simular jogo').props.onClick();
    tree = setMode(page, 'software');
    verify(button(tree, 'Simular software').props.disabled);
    await button(tree, 'Simular software').props.onClick();
    tree = setMode(page, 'compare');
    await button(tree, 'Comparar jogos').props.onClick();
    equal(fixtures.calls.length, 0, `Missing ${missing} blocks all simulations`);
    page.close();
  }
  pass('each of the seven missing required build slots blocks game, comparison and software handlers');

  reset({ games: [], software: [] }); page = await loadedPage(); tree = page.render();
  verify(markup(tree).includes('Nenhum jogo encontrado'));
  verify(markup(setMode(page, 'software')).includes('Nenhum software encontrado'));
  tree = setMode(page, 'single');
  verify(button(tree, 'Simular jogo').props.disabled);
  await button(tree, 'Simular jogo').props.onClick(); equal(fixtures.calls.length, 0);
  fixtures.services.performanceService.listGames = async () => catalog;
  button(tree, 'Atualizar jogos').props.onClick(); page.render(); await tick(); tree = page.render();
  verify(!button(tree, 'Simular jogo').props.disabled);
  page.close();
  reset({ games: [catalog[5]] }); fixtures.build.game.gameId = 'deleted-game'; page = await loadedPage(); tree = page.render();
  equal(select(tree, 'Jogo').props.value, 'game-6');
  verify(!button(tree, 'Simular jogo').props.disabled);
  tree = setMode(page, 'compare');
  verify(button(tree, 'Comparar jogos').props.disabled);
  verify(childrenText(tree).includes('1 jogo(s) selecionado(s)'));
  page.close();
  pass('empty catalogs are explicit and reloadable; missing saved game falls back; a one-game catalog cannot compare');

  reset();
  let gameCatalogAttempts = 0;
  let softwareCatalogAttempts = 0;
  fixtures.services.performanceService.listGames = async () => { if (++gameCatalogAttempts === 1) throw apiError(0, 'Network failure'); return catalog; };
  fixtures.services.professionalSoftwareService.list = async () => { if (++softwareCatalogAttempts === 1) throw apiError(503, 'Catálogo temporariamente indisponível'); return softwareCatalog; };
  page = await loadedPage(); tree = page.render();
  verify(button(tree, 'Simular jogo').props.disabled);
  verify(markup(tree).includes('Não foi possível conectar ao serviço'));
  const gameCatalogError = named(tree, 'ErrorState'); equal(gameCatalogError.length, 1);
  tree = setMode(page, 'software');
  verify(markup(tree).includes('Catálogo temporariamente indisponível'));
  const softwareCatalogError = named(tree, 'ErrorState'); equal(softwareCatalogError.length, 1);
  [...gameCatalogError, ...softwareCatalogError].forEach(error => error.props.onRetry()); page.render(); await tick(); tree = page.render();
  equal(gameCatalogAttempts, 2); equal(softwareCatalogAttempts, 2);
  verify(!button(tree, 'Simular software').props.disabled);
  verify(!button(setMode(page, 'single'), 'Simular jogo').props.disabled);
  page.close();
  pass('game/software catalog failures show honest messages and their retry handlers recover');

  const failureCases = [
    ['missing game', apiError(404, 'Jogo não encontrado.'), 'Jogo não encontrado.'],
    ['missing component catalog entry', apiError(404, 'Componente não encontrado no catálogo.'), 'Componente não encontrado no catálogo.'],
    ['missing performance parameters', apiError(400, 'Parametros de desempenho insuficientes para simulacao de jogos.', ['Parametros de desempenho nao encontrados para cpu.']), 'Faltam dados de desempenho de uma ou mais peças'],
    ['network error', apiError(0, 'Failed to fetch'), 'Não foi possível conectar ao serviço']
  ];
  for (const [name, failure, expected] of failureCases) {
    reset(); let attempts = 0;
    fixtures.services.performanceService.simulateGame = async payload => { fixtures.calls.push({ name: 'single', payload }); if (++attempts === 1) throw failure; return gameResult(); };
    page = await loadedPage(); setSelection(page, 'Jogo', 'game-4'); setSelection(page, 'Resolução', '4k'); tree = setSelection(page, 'Qualidade gráfica', 'low');
    await button(tree, 'Simular jogo').props.onClick(); tree = page.render();
    equal(gameResults(tree).length, 0);
    verify(markup(tree).includes(expected), name);
    if (failure.errors) verify(markup(tree).includes(failure.errors[0]), 'Backend detail remains inspectable');
    equal(select(tree, 'Jogo').props.value, 'game-4'); equal(select(tree, 'Resolução').props.value, '4k'); equal(select(tree, 'Qualidade gráfica').props.value, 'low');
    equal(requestErrors(tree).length, 1);
    await requestErrors(tree)[0].props.onRetry(); tree = page.render();
    equal(attempts, 2); equal(fixtures.calls[0].payload, fixtures.calls[1].payload, 'Retry retains all submitted settings');
    equal(requestErrors(tree).length, 0); equal(gameResults(tree).length, 1);
    page.close();
  }
  pass('missing game/component/parameters and network failures render detail, retain selections and recover through retry');

  for (const mode of ['compare', 'software']) {
    reset(); let attempts = 0;
    const service = mode === 'compare' ? fixtures.services.gameComparisonService : fixtures.services.professionalSoftwareService;
    service[mode === 'compare' ? 'compare' : 'simulate'] = async payload => { fixtures.calls.push({ name: mode, payload }); if (++attempts === 1) throw apiError(0, 'Failed to fetch'); return mode === 'compare' ? comparisonResult() : softwareResult(); };
    page = await loadedPage(); if (mode === 'compare') { setMode(page, 'compare'); setGameCount(page, 10); }
    else { setMode(page, 'software'); setSelection(page, 'Software', 'software-2'); }
    tree = page.render(); await button(tree, mode === 'compare' ? 'Comparar jogos' : 'Simular software').props.onClick(); tree = page.render();
    verify(markup(tree).includes('Não foi possível conectar ao serviço'));
    await requestErrors(tree)[0].props.onRetry(); tree = page.render();
    equal(attempts, 2); equal(fixtures.calls[0].payload, fixtures.calls[1].payload);
    equal(requestErrors(tree).length, 0); verify(markup(tree).includes(mode === 'compare' ? 'Comparação atual' : 'Programa atual'));
    page.close();
  }
  pass('comparison and software network-error retries retain chosen games/software and recover');

  const gameChanges = [
    ['game', current => setSelection(current, 'Jogo', 'game-2')],
    ['resolution', current => setSelection(current, 'Resolução', '1440p')],
    ['quality', current => setSelection(current, 'Qualidade gráfica', 'ultra')],
    ['build revision', current => { fixtures.build = { ...fixtures.build, revision: fixtures.build.revision + 1 }; return current.render(); }],
    ['build payload', current => { fixtures.build = { ...fixtures.build, selectedComponents: { ...fixtures.build.selectedComponents, gpu: { id: 'gpu-2' } } }; return current.render(); }]
  ];
  for (const [name, change] of gameChanges) {
    reset(); const pending = deferred(); fixtures.services.performanceService.simulateGame = () => pending.promise;
    page = await loadedPage(); tree = page.render();
    const request = button(tree, 'Simular jogo').props.onClick(); tree = page.render();
    verify(button(tree, 'Simular jogo').props.loading, name);
    const pendingButton = button(tree, 'Simular jogo');
    verify(pendingButton.type(pendingButton.props).props.disabled, 'Actual Button component disables repeated native clicks while loading');
    verify(markup(tree).includes('aria-busy="true"'), 'SSR exposes busy state');
    verify(markup(tree).includes('Calculando estimativas'));
    tree = change(page);
    equal(gameResults(tree).length, 0); verify(!named(tree, 'Button').some(item => item.props.loading), `${name} clears loading for old inputs`);
    pending.resolve(gameResult('Resultado obsoleto')); await request; tree = page.render();
    equal(gameResults(tree).length, 0, `${name} must reject late success`);
    fixtures.services.performanceService.simulateGame = async () => gameResult();
    await button(tree, 'Simular jogo').props.onClick(); tree = page.render();
    equal(gameResults(tree).length, 1);
    page.close();
  }
  pass('pending results cannot survive game/resolution/quality/build-revision/build-payload changes; current retries succeed');

  reset(); let pending = deferred(); fixtures.services.gameComparisonService.compare = () => pending.promise;
  page = await loadedPage(); setMode(page, 'compare'); tree = setGameCount(page, 2);
  let request = button(tree, 'Comparar jogos').props.onClick(); tree = setGameCount(page, 3);
  pending.resolve(comparisonResult('Comparação obsoleta')); await request; tree = page.render(); equal(gameResults(tree).length, 0);
  page.close();
  for (const [name, change] of [['resolution', current => setSelection(current, 'Resolução', '1440p')], ['quality', current => setSelection(current, 'Qualidade gráfica', 'ultra')]]) {
    reset(); pending = deferred(); fixtures.services.performanceService.simulateGame = () => pending.promise;
    page = await loadedPage(); tree = page.render(); request = button(tree, 'Simular jogo').props.onClick();
    change(page); setSelection(page, name === 'resolution' ? 'Resolução' : 'Qualidade gráfica', name === 'resolution' ? '1080p' : 'high');
    pending.resolve(gameResult('Resultado A antigo')); await request; tree = page.render(); equal(gameResults(tree).length, 0, `${name} A→B→A must reject old request`);
    page.close();
  }
  pass('selected-game changes invalidate comparisons; resolution and quality A→B→A do not resurrect earlier requests');

  for (const [name, change] of gameChanges) {
    reset(); page = await loadedPage(); tree = page.render(); await button(tree, 'Simular jogo').props.onClick();
    equal(gameResults(page.render()).length, 1); tree = change(page); equal(gameResults(tree).length, 0, `${name} must clear completed result`); page.close();
  }
  reset(); page = await loadedPage(); setSelection(page, 'Jogo', 'game-5'); setSelection(page, 'Resolução', '4k'); setSelection(page, 'Qualidade gráfica', 'low');
  fixtures.build = { ...fixtures.build, revision: 8, selectedComponents: { ...fixtures.build.selectedComponents, cpu: { id: 'cpu-2' } } }; tree = page.render();
  equal(select(tree, 'Jogo').props.value, 'game-5'); equal(select(tree, 'Resolução').props.value, '4k'); equal(select(tree, 'Qualidade gráfica').props.value, 'low');
  await button(tree, 'Simular jogo').props.onClick(); equal(fixtures.calls.at(-1).payload.build.cpuId, 'cpu-2');
  page.close();
  pass('completed results clear on criteria/build changes, while page-local selections survive a build replacement');

  reset(); page = await loadedPage(); setSelection(page, 'Jogo', 'game-5'); setSelection(page, 'Resolução', '4k'); setSelection(page, 'Qualidade gráfica', 'low');
  page.close(); page = await loadedPage(); tree = page.render();
  equal(select(tree, 'Jogo').props.value, fixtures.build.game.gameId);
  equal(select(tree, 'Resolução').props.value, fixtures.build.game.targetResolution);
  equal(select(tree, 'Qualidade gráfica').props.value, fixtures.build.game.qualityPreset);
  page.close();
  pass('storage-unavailable fallback: a fresh PerformanceLab mount restores build.game defaults');

  for (const change of ['software', 'revision', 'payload']) {
    reset(); pending = deferred(); fixtures.services.professionalSoftwareService.simulate = () => pending.promise;
    page = await loadedPage(); tree = setMode(page, 'software'); request = button(tree, 'Simular software').props.onClick();
    verify(button(page.render(), 'Simular software').props.loading);
    if (change === 'software') setSelection(page, 'Software', 'software-2');
    else if (change === 'revision') { fixtures.build = { ...fixtures.build, revision: 8 }; page.render(); }
    else { fixtures.build = { ...fixtures.build, selectedComponents: { ...fixtures.build.selectedComponents, cpu: { id: 'cpu-2' } } }; page.render(); }
    pending.resolve(softwareResult('Programa obsoleto')); await request; tree = page.render();
    equal(named(tree, 'SoftwareResult')[0].props.result, null, `${change} invalidates professional result`);
    page.close();
  }
  reset(); const gamePending = deferred(); const softwarePending = deferred();
  fixtures.services.performanceService.simulateGame = () => gamePending.promise;
  fixtures.services.professionalSoftwareService.simulate = () => softwarePending.promise;
  page = await loadedPage(); tree = page.render();
  const gameRun = button(tree, 'Simular jogo').props.onClick();
  tree = setMode(page, 'software'); const softwareRun = button(tree, 'Simular software').props.onClick();
  setMode(page, 'single'); setSelection(page, 'Resolução', '1440p'); gamePending.resolve(gameResult('Obsoleto')); softwarePending.resolve(softwareResult('Programa independente'));
  await Promise.all([gameRun, softwareRun]); tree = page.render();
  equal(gameResults(tree).length, 0); equal(named(setMode(page, 'software'), 'SoftwareResult')[0].props.result.software, 'Programa independente');
  page.close();
  pass('software/build changes reject late professional results; independent software requests survive game-only edits');


  // Task controls are conditionally rendered, but their request owners stay in
  // the actual parent page. These are source/handler checks, not DOM events.
  reset(); page = await loadedPage();
  fixtures.build.actions = { setCoolingConditions(value) { fixtures.build = { ...fixtures.build, coolingConditions: value }; } };
  await button(page.render(), 'Simular jogo').props.onClick();
  const gameBeforeCooling = gameResults(page.render())[0].props.result;
  const callsBeforeCooling = fixtures.calls.length;
  const revisionBeforeCooling = fixtures.build.revision;
  tree = setMode(page, 'cooling');
  const coolingPanel = named(tree, 'CoolingSimulationPanel')[0];
  verify(coolingPanel, 'Cooling task renders the actual simulator component');
  equal(coolingPanel.props.cpu, fixtures.build.selectedComponents.cpu);
  equal(coolingPanel.props.cooler, fixtures.build.selectedComponents.cooler);
  equal(coolingPanel.props.fans, fixtures.build.selectedComponents.fans);
  equal(coolingPanel.props.caseComponent, fixtures.build.selectedComponents.case);
  coolingPanel.props.onConditionsChange({ inletCelsius: 30, coolerSpeedFraction: 0.75 });
  tree = page.render();
  equal(named(tree, 'CoolingSimulationPanel')[0].props.conditions.inletCelsius, 30);
  equal(fixtures.build.revision, revisionBeforeCooling, 'A thermal what-if must not change the selected build revision');
  tree = setMode(page, 'single');
  equal(gameResults(tree)[0].props.result, gameBeforeCooling, 'Thermal settings do not invalidate unrelated game estimates');
  equal(fixtures.calls.length, callsBeforeCooling, 'Thermal task and condition edits make no API requests');
  tree = setMode(page, 'cooling');
  equal(named(tree, 'CoolingSimulationPanel')[0].props.conditions.inletCelsius, 30);
  page.close();
  pass('Cooling task passes exact selected hardware and persists local what-if conditions without invalidating or resubmitting game analysis');

  const tasks = ['single', 'compare', 'software'];
  const taskAction = mode => ({ single: 'Simular jogo', compare: 'Comparar jogos', software: 'Simular software' })[mode];
  const taskResult = (mode, label) => mode === 'single' ? gameResult(label) : mode === 'compare' ? comparisonResult(label) : softwareResult(label);
  const taskService = mode => mode === 'single' ? [fixtures.services.performanceService, 'simulateGame'] : mode === 'compare' ? [fixtures.services.gameComparisonService, 'compare'] : [fixtures.services.professionalSoftwareService, 'simulate'];
  const visibleResult = tree => gameResults(tree)[0]?.props.result || named(tree, 'SoftwareResult')[0]?.props.result || null;

  reset(); page = await loadedPage();
  setSelection(page, 'Jogo', 'game-4'); setSelection(page, 'Resolução', '1440p'); setSelection(page, 'Qualidade gráfica', 'ultra');
  setMode(page, 'compare'); setGameCount(page, 3);
  setMode(page, 'software'); setSelection(page, 'Software', 'software-2');
  const pendingTasks = new Map();
  for (const mode of tasks) {
    const deferredResult = deferred(); const [service, method] = taskService(mode);
    service[method] = payload => { fixtures.calls.push({ name: mode, payload }); return deferredResult.promise; };
    tree = setMode(page, mode);
    const run = button(tree, taskAction(mode)).props.onClick();
    verify(button(page.render(), taskAction(mode)).props.loading);
    pendingTasks.set(mode, { ...deferredResult, run });
  }
  for (const mode of tasks) {
    tree = setMode(page, mode);
    equal(named(tree, 'TaskPanel').filter(panel => panel.props.active).length, 1);
    equal(named(tree, 'Button').filter(node => tasks.map(taskAction).includes(childrenText(node))).length, 1, 'Only active simulation controls render');
    verify(button(tree, taskAction(mode)).props.loading, 'Switching away and back retains the pending request');
  }
  equal(fixtures.calls.length, 3, 'Tab changes do not refetch or resubmit');
  for (const mode of tasks) {
    setMode(page, mode === 'single' ? 'software' : 'single');
    const pendingTask = pendingTasks.get(mode); pendingTask.resolve(taskResult(mode, 'Retained ' + mode)); await pendingTask.run; page.render();
  }
  for (const mode of [...tasks, ...tasks].reverse()) {
    tree = setMode(page, mode); equal(visibleResult(tree), taskResult(mode, 'Retained ' + mode));
    if (mode === 'single') equal(select(tree, 'Jogo').props.value, 'game-4');
    if (mode === 'compare') equal(all(tree, node => node.type === 'input' && node.props.type === 'checkbox' && node.props.checked).length, 3);
    if (mode === 'software') equal(select(tree, 'Software').props.value, 'software-2');
    else { equal(select(tree, 'Resolução').props.value, '1440p'); equal(select(tree, 'Qualidade gráfica').props.value, 'ultra'); }
  }
  equal(fixtures.calls.length, 3); page.close();
  pass('all three tasks retain independent pending/completed results and inputs across repeated visits; tabs alone send no requests');

  for (const pendingResult of [false, true]) {
    for (const mode of tasks) {
      reset(); page = await loadedPage(); tree = setMode(page, mode);
      const deferredResult = deferred(); const [service, method] = taskService(mode);
      if (pendingResult) service[method] = () => deferredResult.promise;
      const run = button(tree, taskAction(mode)).props.onClick();
      if (!pendingResult) { await run; verify(visibleResult(page.render())); }
      setMode(page, mode === 'single' ? 'software' : 'single');
      fixtures.build = { ...fixtures.build, revision: fixtures.build.revision + 1 }; page.render();
      if (pendingResult) { deferredResult.resolve(taskResult(mode, 'STALE HIDDEN RESULT')); await run; }
      tree = setMode(page, mode); equal(visibleResult(tree), null, 'Build revision invalidates ' + (pendingResult ? 'pending' : 'completed') + ' hidden ' + mode);
      verify(!button(tree, taskAction(mode)).props.loading);
      service[method] = async () => taskResult(mode, 'Fresh ' + mode);
      await button(tree, taskAction(mode)).props.onClick(); equal(visibleResult(page.render()), taskResult(mode, 'Fresh ' + mode)); page.close();
    }
  }
  pass('build revision invalidates completed and pending hidden results in every task; fresh explicit retries recover');

  for (const mode of tasks) {
    reset(); page = await loadedPage(); tree = setMode(page, mode);
    const [service, method] = taskService(mode); service[method] = async () => { throw apiError(503, 'Task error ' + mode); };
    await button(tree, taskAction(mode)).props.onClick(); tree = page.render(); equal(requestErrors(tree).length, 1);
    setMode(page, mode === 'single' ? 'software' : 'single');
    tree = setMode(page, mode); equal(requestErrors(tree).length, 1, 'Error belongs to its task after revisit');
    const older = deferred(); service[method] = () => older.promise;
    const oldRetry = requestErrors(tree)[0].props.onRetry(); page.render();
    service[method] = async () => taskResult(mode, 'Recovered ' + mode);
    // Invoke a captured handler to verify request ownership even if a caller
    // bypasses Button's native disabled protection.
    await button(page.render(), taskAction(mode)).props.onClick();
    older.reject(apiError(503, 'Stale retry failure')); await oldRetry;
    tree = page.render(); equal(requestErrors(tree).length, 0); equal(visibleResult(tree), taskResult(mode, 'Recovered ' + mode));
    const late = deferred(); service[method] = () => late.promise;
    const lastRun = button(tree, taskAction(mode)).props.onClick();
    setMode(page, mode === 'single' ? 'software' : 'single'); page.close();
    late.resolve(taskResult(mode, 'AFTER UNMOUNT')); await lastRun; equal(page.writesAfterClose, 0);
    page = await loadedPage(); tree = setMode(page, mode); equal(visibleResult(tree), null); page.close();
  }
  pass('per-task errors survive revisit, retry ownership rejects older failures, and hidden pending requests cannot write after unmount');

  let key = 'A'; let hook = runtime(() => useSimulationRequest(key));
  let state = hook.render(); equal(state.status, 'idle');
  const first = deferred(); const second = deferred();
  const firstRun = state.run(() => first.promise); state = hook.render(); equal(state.status, 'loading');
  const secondRun = state.run(() => second.promise); second.resolve({ id: 'newest' }); await secondRun;
  equal(hook.render().result, { id: 'newest' }); first.resolve({ id: 'older' }); await firstRun;
  equal(hook.render().result, { id: 'newest' }, 'Older same-key success must not overwrite newer success');
  const oldFailure = deferred(); const failureRun = hook.render().run(() => oldFailure.promise);
  await hook.render().run(async () => ({ id: 'recovered' })); oldFailure.reject(apiError(0, 'Late failure')); await failureRun;
  equal(hook.render().status, 'success'); equal(hook.render().result, { id: 'recovered' });
  pending = deferred(); request = hook.render().run(() => pending.promise);
  key = 'B'; equal(hook.render().status, 'idle'); key = 'A'; equal(hook.render().status, 'idle');
  pending.resolve({ id: 'obsolete-A' }); await request; equal(hook.render().status, 'idle');
  const syncFailure = apiError(400, 'Invalid parameters'); await hook.render().run(() => { throw syncFailure; });
  state = hook.render(); equal(state.status, 'error'); equal(state.error, syncFailure);
  await state.run(async () => ({ id: 'retry' })); equal(hook.render().status, 'success');
  pending = deferred(); request = hook.render().run(() => pending.promise); hook.close(); pending.resolve({ id: 'after-unmount' }); await request;
  equal(hook.writesAfterClose, 0);
  pass('actual request hook: latest repeated request wins, stale failures ignored, A→B→A safe, sync errors retryable, unmount blocks writes');

  reset(); pending = deferred(); fixtures.services.performanceService.listGames = () => pending.promise;
  page = runtime(PerformanceLab); page.render(); page.close(); pending.resolve(catalog); await tick(); equal(page.writesAfterClose, 0);
  pass('catalog request cleanup suppresses state writes after unmount');

  function summaryActions() {
    fixtures.build.actions = {
      setAnalyzedSummary(summary, revision) { fixtures.calls.push({ name: 'storeSummary', summary, revision }); },
      setGame(settings) { fixtures.calls.push({ name: 'setGame', settings }); fixtures.build = { ...fixtures.build, revision: fixtures.build.revision + 1, game: { ...fixtures.build.game, ...settings } }; }
    };
  }
  const summaryGameLabel = 'Jogo';
  const summaryHint = tree => childrenText(all(tree, node => node.props?.id === 'summary-simulation-hint')[0]);
  reset(); summaryActions();
  fixtures.build.coolingConditions = { inletCelsius: 27, coolerSpeedFraction: 0.75, fanSpeedFraction: 0.5 };
  fixtures.build.actions.setCoolingConditions = conditions => { fixtures.build = { ...fixtures.build, coolingConditions: conditions }; };
  page = await loadedPage(BuildSummary); tree = page.render();
  const summaryCoolingPanels = named(tree, 'CoolingSimulationPanel');
  equal(summaryCoolingPanels.length, 1, 'Summary renders exactly one real thermal simulator');
  const summaryCooling = summaryCoolingPanels[0];
  for (const [prop, slot] of [['cpu', 'cpu'], ['cooler', 'cooler'], ['fans', 'fans'], ['caseComponent', 'case']]) {
    verify(summaryCooling.props[prop] === fixtures.build.selectedComponents[slot], `Summary passes the exact selected ${slot}`);
  }
  verify(summaryCooling.props.conditions === fixtures.build.coolingConditions, 'Summary passes the persisted scenario unchanged');
  verify(summaryCooling.props.onConditionsChange === fixtures.build.actions.setCoolingConditions, 'Summary uses the shared conditions action');
  const summaryCoolingSection = all(tree, node => node.props?.id === 'cooling-simulation');
  equal(summaryCoolingSection.length, 1);
  equal(summaryCoolingSection[0].props.tabIndex, -1);
  equal(named(summaryCoolingSection[0], 'CoolingSimulationPanel').length, 1, 'Thermal anchor wraps the actual simulator');
  const nextSummaryConditions = { ...fixtures.build.coolingConditions, inletCelsius: 30 };
  summaryCooling.props.onConditionsChange(nextSummaryConditions);
  tree = page.render();
  verify(named(tree, 'CoolingSimulationPanel')[0].props.conditions === nextSummaryConditions);
  equal(fixtures.calls, [], 'Editing a Summary thermal scenario sends no analysis requests');
  page.close();
  pass('BuildSummary renders one anchored thermal simulator with the exact selected hardware, persisted conditions and shared conditions action');

  reset(); summaryActions(); pending = deferred(); fixtures.services.performanceService.listGames = () => pending.promise;
  page = runtime(BuildSummary); tree = page.render();
  verify(select(tree, summaryGameLabel).props.disabled);
  equal(select(tree, summaryGameLabel).props.options, [{ value: '', label: 'Selecione um jogo disponível' }]);
  equal(select(tree, summaryGameLabel).props.value, '');
  verify(button(tree, 'Simular desempenho').props.disabled);
  equal(summaryHint(tree), 'Aguarde o carregamento dos jogos.');
  verify(markup(tree).includes('Carregando jogos...'));
  verify(!markup(tree).includes('Cyberpunk'), 'Loading catalog must not invent a Cyberpunk option');
  verify(!button(tree, 'Gerar resumo final').props.disabled, 'Other summary analyses remain available during catalog load');
  await button(tree, 'Gerar resumo final').props.onClick(); tree = page.render();
  equal(fixtures.calls.filter(call => call.name === 'summary').length, 1);
  equal(fixtures.calls.filter(call => call.name === 'storeSummary').length, 1);
  pending.resolve(catalog); await tick(); tree = page.render();
  verify(!button(tree, 'Simular desempenho').props.disabled);
  equal(select(tree, summaryGameLabel).props.options, catalog.map(game => ({ value: game.id, label: game.name })));
  await button(tree, 'Simular desempenho').props.onClick(); equal(fixtures.calls.filter(call => call.name === 'summary').length, 2);
  page.close();
  pass('BuildSummary loading has no fabricated option, blocks simulation, permits general summary, then enables available game');

  reset(); summaryActions(); let summaryCatalogAttempts = 0;
  fixtures.services.performanceService.listGames = async () => { if (++summaryCatalogAttempts === 1) throw apiError(503, 'Catálogo de jogos temporariamente indisponível'); return catalog; };
  page = await loadedPage(BuildSummary); tree = page.render();
  verify(markup(tree).includes('Catálogo de jogos temporariamente indisponível'));
  verify(!markup(tree).includes('Cyberpunk'));
  verify(button(tree, 'Simular desempenho').props.disabled);
  verify(!button(tree, 'Gerar resumo final').props.disabled);
  equal(summaryHint(tree), 'Recarregue o catálogo para simular um jogo.');
  equal(named(tree, 'ErrorState').length, 1);
  named(tree, 'ErrorState')[0].props.onRetry(); tree = page.render();
  verify(button(tree, 'Simular desempenho').props.disabled);
  await tick(); tree = page.render();
  equal(summaryCatalogAttempts, 2); equal(named(tree, 'ErrorState').length, 0);
  verify(!button(tree, 'Simular desempenho').props.disabled);
  page.close();
  pass('BuildSummary catalog errors are visible and retry recovers without a fabricated game');

  for (const games of [[], { invalid: 'catalog shape' }]) {
    reset({ games }); summaryActions(); page = await loadedPage(BuildSummary); tree = page.render();
    verify(markup(tree).includes('Nenhum jogo disponível no catálogo'));
    verify(!markup(tree).includes('Cyberpunk'));
    verify(button(tree, 'Simular desempenho').props.disabled);
    verify(!button(tree, 'Gerar resumo final').props.disabled);
    equal(select(tree, summaryGameLabel).props.options, [{ value: '', label: 'Selecione um jogo disponível' }]);
    fixtures.services.performanceService.listGames = async () => catalog;
    button(tree, 'Atualizar jogos').props.onClick(); page.render(); await tick(); tree = page.render();
    verify(!button(tree, 'Simular desempenho').props.disabled); page.close();
  }
  reset(); summaryActions(); fixtures.build.game.gameId = 'removed-from-catalog'; page = await loadedPage(BuildSummary); tree = page.render();
  verify(button(tree, 'Simular desempenho').props.disabled);
  verify(!select(tree, summaryGameLabel).props.disabled, 'Missing selected game must allow a current choice');
  equal(select(tree, summaryGameLabel).props.value, '');
  equal(select(tree, summaryGameLabel).props.options.length, catalog.length + 1);
  equal(summaryHint(tree), 'Selecione um jogo disponível para simular.');
  tree = setSelection(page, summaryGameLabel, 'game-2');
  verify(!button(tree, 'Simular desempenho').props.disabled);
  equal(fixtures.build.game, { gameId: 'game-2', targetResolution: '1080p', qualityPreset: 'high' });
  await button(tree, 'Simular desempenho').props.onClick(); equal(fixtures.calls.find(call => call.name === 'summary').payload.gameId, 'game-2');
  page.close();
  pass('BuildSummary empty/malformed catalogs recover; missing selected game requires an available choice and retains other settings');

  reset(); summaryActions(); pending = deferred(); fixtures.services.performanceService.listGames = () => pending.promise;
  page = runtime(BuildSummary); page.render(); page.close(); pending.resolve(catalog); await tick(); equal(page.writesAfterClose, 0);
  reset(); summaryActions(); delete fixtures.build.selectedComponents.gpu; page = await loadedPage(BuildSummary); tree = page.render();
  verify(button(tree, 'Simular desempenho').props.disabled); equal(summaryHint(tree), 'Complete a montagem antes de simular.');
  await button(tree, 'Simular desempenho').props.onClick(); equal(fixtures.calls.length, 0); page.close();
  pass('BuildSummary catalog cleanup blocks post-unmount writes; incomplete build guards the simulation handler');

  // Summary disclosures retain real action callbacks and keep feedback/errors outside hidden controls.
  reset(); summaryActions(); page = await loadedPage(BuildSummary); tree = page.render();
  const disclosure = (tree, text) => all(tree, node => node.type === 'details' && all(node, child => child.type === 'summary' && childrenText(child) === text).length)[0];
  for (const title of ['Ver ou trocar peças', 'Pontuação da configuração', 'Relatório e exportação']) {
    const details = disclosure(tree, title);
    verify(details, `Missing disclosure: ${title}`);
    verify(!details.props.open, `${title} must start collapsed`);
  }
  equal(named(tree, 'Button').filter(node => childrenText(node).trim() === 'Compartilhar').length, 1, 'Exactly one share action');
  equal(named(tree, 'Button').filter(node => childrenText(node).trim() === 'Gerar relatório técnico').length, 1, 'Exactly one report action');
  equal(named(tree, 'Button').filter(node => childrenText(node).trim() === 'Exportar JSON').length, 1, 'Exactly one export action');
  equal(named(disclosure(tree, 'Ver ou trocar peças'), 'BuildSummaryCard').length, 1);
  equal(named(disclosure(tree, 'Pontuação da configuração'), 'BuildScorePanel').length, 1);
  verify(button(disclosure(tree, 'Relatório e exportação'), 'Gerar relatório técnico'));
  verify(button(disclosure(tree, 'Relatório e exportação'), 'Exportar JSON'));
  named(tree, 'BuildSummaryCard')[0].props.onEdit('gpu'); tree = page.render();
  equal(named(tree, 'ComponentReplacement')[0].props.type, 'gpu');
  named(tree, 'ComponentReplacement')[0].props.onClose();
  equal(named(page.render(), 'ComponentReplacement').length, 0);
  const analyticsPayload = { build: fixtures.build.buildPayload, budget: fixtures.build.budget, usageType: 'gaming' };
  const scoreValue = { overallScore: 70, criteria: { compatibilityScore: 100 }, warnings: ['Estimativa de teste'] };
  fixtures.services.buildScoreService = { calculate: async payload => { equal(payload, analyticsPayload); return scoreValue; } };
  await named(page.render(), 'BuildScorePanel')[0].props.onCalculate(); tree = page.render();
  equal(named(tree, 'BuildScorePanel')[0].props.score, scoreValue);
  verify(markup(tree).includes('Estimativa de teste'));
  const reportValue = { report: { summary: 'Relatório preservado' } };
  fixtures.services.buildReportService = { generate: async payload => { equal(payload, { ...analyticsPayload, gameIds: ['game-1'], includePurchaseLinks: true }); return reportValue; } };
  await button(tree, 'Gerar relatório técnico').props.onClick(); tree = page.render();
  const reportModal = named(tree, 'Modal').find(node => node.props.title === 'Relatório técnico da configuração');
  verify(reportModal.props.open); equal(named(reportModal, 'TechnicalReportView')[0].props.report, reportValue);
  reportModal.props.onClose();
  verify(!named(page.render(), 'Modal').find(node => node.props.title === reportModal.props.title).props.open);
  const exportValue = { build: fixtures.build.buildPayload, format: 'json' };
  fixtures.services.buildExportService = { exportJson: async payload => { equal(payload, { ...analyticsPayload, includeSummary: true, includePurchaseLinks: true }); return exportValue; } };
  await button(page.render(), 'Exportar JSON').props.onClick(); tree = page.render();
  const exportModal = named(tree, 'Modal').find(node => node.props.title === 'Exportação JSON da build');
  verify(exportModal.props.open);
  equal(JSON.parse(childrenText(all(exportModal, node => node.type === 'pre')[0])), exportValue);
  exportModal.props.onClose();
  verify(!named(page.render(), 'Modal').find(node => node.props.title === exportModal.props.title).props.open);
  fixtures.services.savedBuildsService = { create: async payload => { equal(payload.components, fixtures.build.buildPayload); equal(payload.budget, fixtures.build.budget); } };
  await button(page.render(), 'Salvar como nova configuração').props.onClick();
  verify(markup(page.render()).includes('A versão salva anteriormente foi mantida'));
  fixtures.services.sharingService = { create: async payload => { equal(payload.build, fixtures.build.buildPayload); return { shareId: 'fixture-share', shareUrl: '/shared-builds/fixture-share' }; } };
  await button(page.render(), 'Compartilhar').props.onClick(); tree = page.render();
  verify(markup(tree).includes('fixture-share'));
  verify(button(tree, 'Copiar link'));
  page.close();
  pass('Summary collapsed parts/score/report/export keep replacement, scoring, report, export, save and single share handlers with correct payloads and closable results');

  reset(); summaryActions(); page = await loadedPage(BuildSummary);
  fixtures.services.buildReportService = { generate: async () => { throw new Error('Relatório indisponível'); } };
  await button(page.render(), 'Gerar relatório técnico').props.onClick(); tree = page.render();
  verify(markup(tree).includes('Relatório indisponível'));
  verify(!markup(disclosure(tree, 'Relatório e exportação')).includes('Relatório indisponível'), 'Report failure must remain outside collapsed action disclosure');
  verify(!button(tree, 'Gerar relatório técnico').props.disabled);
  fixtures.services.buildReportService.generate = async () => ({ report: { summary: 'Nova tentativa' } });
  await button(tree, 'Gerar relatório técnico').props.onClick(); tree = page.render();
  verify(!markup(tree).includes('Relatório indisponível'));
  verify(named(tree, 'Modal').find(node => node.props.title === 'Relatório técnico da configuração').props.open);
  page.close();
  reset(); summaryActions(); delete fixtures.build.selectedComponents.gpu; page = await loadedPage(BuildSummary); tree = page.render();
  verify(markup(tree).includes('Montagem incompleta'));
  verify(!markup(disclosure(tree, 'Ver ou trocar peças')).includes('Montagem incompleta'), 'Incomplete-build warning stays outside collapsed parts');
  page.close();
  pass('Summary report failures remain visible and retryable; incomplete-build warning is visible before opening the parts disclosure');

  // New feedback regressions exercise real page functions and handlers.
  reset(); summaryActions(); fixtures.build.gamePerformance = gameResult('Valorant');
  page = await loadedPage(BuildSummary); tree = page.render();
  verify(summaryHint(tree).includes('Estimativa atualizada'));
  verify(!summaryHint(tree).includes('Execute a simulação'));
  const retainedGameResult = fixtures.build.gamePerformance;
  page.close(); page = await loadedPage(BuildSummary); tree = page.render();
  equal(named(tree, 'GameSimulationResult')[0].props.result, retainedGameResult, 'SPA page remount retains provider-owned summary result');
  equal(fixtures.calls.filter(call => call.name === 'summary').length, 0, 'Returning to summary does not require another analysis');
  verify(!childrenText(tree).includes('Recarregar o site ou mudar dados do catálogo exige uma nova análise'), 'Navigation state is tested without repeating a long instruction on every summary');
  fixtures.build.gamePerformance = { status: 'unavailable', available: false, message: 'Dados ausentes' };
  tree = page.render(); verify(summaryHint(tree).includes('Simulação indisponível'));
  fixtures.build.gamePerformance = null; tree = page.render(); verify(summaryHint(tree).includes('Execute a simulação'));
  page.close(); pass('summary hint distinguishes complete estimate, unavailable and invalidated result in actual page render');

  reset();
  const savedComponents = structuredClone(fixtures.build.selectedComponents);
  const saved = [{ id: 'saved-a', name: 'Mesmo nome', components: savedComponents }, { id: 'saved-b', name: 'Mesmo nome', components: savedComponents }];
  fixtures.services.savedBuildsService = { list: async () => saved };
  const comparedResult = { builds: [0, 1].map(comparisonIndex => ({ comparisonIndex, name: 'Mesmo nome', compatible: comparisonIndex === 0, compatibilityStatus: comparisonIndex === 0 ? 'compatible' : 'incompatible', performanceScore: 70, costBenefitScore: 45, totalEstimatedPrice: 4000, components: savedComponents, alertSummary: { total: comparisonIndex }, bottleneckSummary: { total: 0 }, bottleneckStatus: comparisonIndex === 0 ? 'analyzed' : 'unavailable' })), recommendedBuild: { comparisonIndex: 0, name: 'Mesmo nome', reason: 'Critérios do modelo' } };
  fixtures.services.buildComparisonService = { compare: async payload => { fixtures.calls.push({ name: 'buildComparison', payload }); return comparedResult; } };
  page = await loadedPage(CompareBuilds); tree = page.render();
  verify(button(tree, 'Comparar selecionadas').props.disabled, 'Only one current configuration is insufficient');
  named(tree, 'Button').find(node => childrenText(node) === 'Selecionar').props.onClick(); tree = page.render();
  verify(!button(tree, 'Comparar selecionadas').props.disabled);
  const preservedBuild = JSON.stringify({ ...fixtures.build, actions: undefined });
  await button(tree, 'Comparar selecionadas').props.onClick(); tree = page.render();
  equal(fixtures.calls.at(-1).payload.builds.map(build => build.name), ['Montagem atual', 'Mesmo nome']);
  const comparisonHtml = markup(tree);
  for (const label of ['Índice de custo-benefício', 'Alertas e gargalos', 'sem conclusão para esta configuração', '45 / 100']) verify(comparisonHtml.includes(label), label);
  verify(comparisonHtml.includes('alert-success'), 'Duplicate name must not make incompatible row the recommendation');
  all(tree, node => node.type === 'input' && node.props.type === 'checkbox')[0].props.onChange({ target: { checked: false } }); tree = page.render();
  verify(button(tree, 'Comparar selecionadas').props.disabled);
  verify(!childrenText(tree).includes('Critérios do modelo'), 'Selection changes clear old result');
  const priorCalls = fixtures.calls.length;
  await button(tree, 'Comparar selecionadas').props.onClick(); equal(fixtures.calls.length, priorCalls, 'Direct handler enforces minimum');
  named(tree, 'Button').find(node => childrenText(node) === 'Selecionar').props.onClick(); tree = page.render();
  pending = deferred(); fixtures.services.buildComparisonService.compare = async payload => { fixtures.calls.push({ name: 'buildComparison', payload }); return pending.promise; };
  const lateComparison = button(tree, 'Comparar selecionadas').props.onClick(); page.render();
  equal(fixtures.calls.at(-1).payload.builds.map(build => build.name), ['Mesmo nome', 'Mesmo nome']);
  all(page.render(), node => node.type === 'input' && node.props.type === 'checkbox')[0].props.onChange({ target: { checked: true } }); page.render();
  pending.resolve(comparedResult); await lateComparison; tree = page.render();
  verify(!childrenText(tree).includes('Critérios do modelo'), 'Late comparison response cannot label newer selections');
  equal(JSON.stringify({ ...fixtures.build, actions: undefined }), preservedBuild, 'Comparing does not change chosen components, accessories or budget');
  page.close(); pass('explicit current/saved comparison selection, duplicate names, useful trade-offs, minimum guards and late-result invalidation');

  reset();
  globalThis.document = { querySelector: () => null };
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.requestAnimationFrame = callback => { callback(); return 1; };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  fixtures.build.wizardStep = 'motherboard';
  fixtures.build.selectedComponents.cpu = { id: 'cpu-5600', name: 'Ryzen 5600', specs: { socket: 'AM4' } };
  fixtures.build.selectedComponents.motherboard = { id: 'board-b650', name: 'B650', specs: { socket: 'AM5' } };
  const compatibleBoard = { id: 'board-b550', name: 'B550', category: 'motherboard', specs: { socket: 'AM4' } };
  fixtures.catalog.byType.motherboard = [compatibleBoard];
  fixtures.build.actions = {
    selectComponent(type, component) { fixtures.build = { ...fixtures.build, revision: fixtures.build.revision + 1, selectedComponents: { ...fixtures.build.selectedComponents, [type]: component } }; },
    setWizardStep(step) { fixtures.build = { ...fixtures.build, wizardStep: step }; },
    setResult() {}
  };
  page = runtime(BuildWizard); tree = page.render();
  verify(!named(tree, 'WizardNavigation')[0].props.canAdvance);
  verify(childrenText(tree).includes('AM4') && childrenText(tree).includes('AM5'));
  verify(childrenText(tree).includes('Conflito entre as peças escolhidas') || named(tree, 'Alert').some(node => node.props.title === 'Conflito entre as peças escolhidas'));
  const others = JSON.stringify(Object.fromEntries(Object.entries(fixtures.build.selectedComponents).filter(([slot]) => slot !== 'motherboard')));
  named(tree, 'ComponentCard')[0].props.onSelect(compatibleBoard); tree = page.render();
  verify(named(tree, 'WizardNavigation')[0].props.canAdvance);
  equal(JSON.stringify(Object.fromEntries(Object.entries(fixtures.build.selectedComponents).filter(([slot]) => slot !== 'motherboard'))), others);
  verify(!named(tree, 'Alert').some(node => node.props.title === 'Conflito entre as peças escolhidas'));
  page.close();
  pass('wizard detects actual AM4/AM5 selection immediately, prevents next, resolves replacement and preserves every other component');

  // Exercise the actual wizard callback and cleanup with responses held at
  // each service boundary. This tests request ownership, not DOM navigation.
  for (const boundary of ['compatibility', 'alerts', 'budget', 'bottlenecks']) {
    for (const invalidation of ['departure', 'revision']) {
      reset();
      fixtures.build.wizardStep = 'review';
      fixtures.build.bottlenecks = null;
      const delayed = deferred();
      const writes = [];
      fixtures.build.actions = {
        setResult(key, value) { writes.push([key, value]); fixtures.build = { ...fixtures.build, [key]: value }; },
        setBudget(budget) { writes.push(['budget', budget]); fixtures.build = { ...fixtures.build, budget }; }
      };
      fixtures.services.compatibilityService = {
        check: () => boundary === 'compatibility' ? delayed.promise : Promise.resolve({ compatible: true }),
        alerts: () => boundary === 'alerts' ? delayed.promise : Promise.resolve({ compatible: true, alerts: [] })
      };
      fixtures.services.budgetService = { validate: () => boundary === 'budget' ? delayed.promise : Promise.resolve(fixtures.build.budget) };
      fixtures.services.performanceService.analyzeBottlenecks = () => boundary === 'bottlenecks' ? delayed.promise : Promise.resolve({ bottlenecks: [] });
      page = runtime(BuildWizard); tree = page.render();
      const oldRequest = button(tree, 'Analisar build').props.onClick();
      await tick(); page.render();
      if (invalidation === 'departure') {
        page.close();
        equal(fixtures.build.bottlenecks, null, 'Leaving a pending analysis clears its loading state');
      } else {
        fixtures.build = { ...fixtures.build, revision: fixtures.build.revision + 1, bottlenecks: { status: 'success', data: { owner: 'new-build' } } };
        page.render();
      }
      const beforeLate = JSON.stringify({ build: fixtures.build, writes });
      delayed.resolve(boundary === 'budget' ? fixtures.build.budget : { compatible: true, bottlenecks: [] });
      await oldRequest;
      equal(JSON.stringify({ build: fixtures.build, writes }), beforeLate, `Late ${boundary} response must not write after ${invalidation}`);
      if (invalidation === 'departure') equal(page.writesAfterClose, 0, 'No late wizard feedback or request-state writes');
      else page.close();
    }
  }
  reset();
  fixtures.build.wizardStep = 'review';
  fixtures.build.actions = {
    setResult(key, value) { fixtures.build = { ...fixtures.build, [key]: value }; },
    setBudget(budget) { fixtures.build = { ...fixtures.build, budget }; }
  };
  fixtures.services.compatibilityService = { check: async () => ({ compatible: true }), alerts: async () => ({ compatible: true, alerts: [] }) };
  fixtures.services.budgetService = { validate: async () => fixtures.build.budget };
  fixtures.services.performanceService.analyzeBottlenecks = async () => ({ bottlenecks: [], owner: 'completed-build' });
  page = runtime(BuildWizard); tree = page.render();
  await button(tree, 'Analisar build').props.onClick(); page.render();
  equal(fixtures.build.bottlenecks.status, 'success');
  const completed = JSON.stringify(fixtures.build);
  page.close();
  equal(JSON.stringify(fixtures.build), completed, 'Leaving after completion must preserve matching successful build analyses');
  pass('wizard rejects old results at all four service boundaries after departure or a newer build revision');

  delete globalThis.document; delete globalThis.window; delete globalThis.ResizeObserver;
  delete globalThis.requestAnimationFrame; delete globalThis.cancelAnimationFrame;

  console.log(`SUMMARY: ${checks} scenario groups, ${assertions} assertions passed against actual PerformanceLab/BuildSummary/CompareBuilds/BuildWizard/useSimulationRequest source`);
  console.log('LIMITATION: SSR and isolated handlers/hooks only; service responses are fixtures. No browser, DOM events, layout, focus, chart geometry, real network or cross-navigation persistence was tested.');
  console.log('NOTE: this harness omits sessionStorage; session-backed remount restoration is checked separately.');
} finally {
  delete globalThis.__simulationHooks;
  delete globalThis.__simulationFixtures;
  await rm(temporary, { recursive: true, force: true });
}
