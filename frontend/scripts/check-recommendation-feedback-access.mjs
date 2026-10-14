// Actual page functions, SSR, and controlled hooks/service callbacks; no browser.
// Negative controls replace one page with HEAD and must fail:
// --baseline-ready or --baseline-feedback.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { createRecommendationFeedback, clearRecommendationFeedbackForTests } from '../../src/services/recommendationFeedbackService.js';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(frontend, 'package.json'));
const directory = await mkdtemp(join(tmpdir(), 'pcpowerlab-feedback-access-'));
const realReact = require.resolve('react');
const realRouter = require.resolve('react-router-dom');
const baseline = process.argv.includes('--baseline-ready') ? 'ReadyBuilds.jsx'
  : process.argv.includes('--baseline-feedback') ? 'Feedback.jsx' : '';
let fixture;
let groups = 0;
const pass = message => console.log(`PASS ${++groups}: ${message}`);
const originals = { window: globalThis.window, document: globalThis.document };
try {
  await build({
    stdin: { resolveDir: frontend, loader: 'jsx', contents: `
      export { default as React } from 'react';
      export { renderToStaticMarkup } from 'react-dom/server';
      export { MemoryRouter } from 'react-router-dom';
      export { default as ReadyBuilds } from './src/pages/ReadyBuilds.jsx';
      export { default as Feedback, FeedbackForm, CentralFeedback } from './src/pages/Feedback.jsx';
    ` },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: join(directory, 'check.mjs'),
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'controlled-page-runtime', setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'fixture' }));
      builder.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'fixture' }));
      builder.onResolve({ filter: /\/hooks\/use(BuildState|Components)\.(js|jsx)$/ }, args => ({ path: basename(args.path), namespace: 'fixture' }));
      builder.onResolve({ filter: /\/services\/.*Service\.js$/ }, args => ({ path: basename(args.path, '.js'), namespace: 'service' }));
      builder.onLoad({ filter: /.*/, namespace: 'service' }, ({ path }) => ({ contents: `export const ${path} = new Proxy({}, { get: (_, method) => (...args) => globalThis.__feedbackAccess.service(${JSON.stringify(path)}, method, args) });` }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => {
        let contents;
        if (path === 'react') contents = `import * as Real from ${JSON.stringify(realReact)}; export * from ${JSON.stringify(realReact)}; export default Real.default; ${['useState', 'useRef', 'useMemo', 'useCallback', 'useEffect'].map(name => `export const ${name} = (...args) => globalThis.__feedbackHooks ? globalThis.__feedbackHooks.${name}(...args) : Real.${name}(...args);`).join('\n')}`;
        else if (path === 'router') contents = `export * from ${JSON.stringify(realRouter)}; export const useLocation = () => globalThis.__feedbackAccess.location; export const useNavigate = () => globalThis.__feedbackAccess.navigate; export const useSearchParams = () => [new URLSearchParams(globalThis.__feedbackAccess.search), () => {}];`;
        else if (path.startsWith('useBuildState')) contents = 'export const useBuildState = () => globalThis.__feedbackAccess.build;';
        else contents = 'export const useComponents = () => globalThis.__feedbackAccess.catalog; export const useCatalogComponent = part => ({ component: globalThis.__feedbackAccess.catalog.componentMap[typeof part === "string" ? part : part?.id], loading: false, error: "" });';
        return { contents, resolveDir: frontend };
      });
      builder.onLoad({ filter: /\/pages\/(ReadyBuilds|Feedback)\.jsx$/ }, async ({ path }) => {
        const source = basename(path) === baseline
          ? execFileSync('git', ['show', `HEAD:frontend/src/pages/${baseline}`], { cwd: frontend, encoding: 'utf8' })
          : await readFile(path, 'utf8');
        return { contents: source + (path.endsWith('/Feedback.jsx') ? '\nexport { FeedbackForm, CentralFeedback };' : ''), loader: 'jsx' };
      });
    }}]
  });
  const { React, renderToStaticMarkup, MemoryRouter, ReadyBuilds, Feedback, FeedbackForm, CentralFeedback } = await import(pathToFileURL(join(directory, 'check.mjs')).href);
  const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
  const components = types.map(category => ({ id: `${category}-1`, name: `${category} de teste`, category, price: 100 }));
  const selected = { ...Object.fromEntries(components.map(part => [part.category, part])), fans: [] };
  const readyBuild = { id: 'ready-1', name: 'Build de teste', usageProfile: 'gaming', components: selected, estimatedTotalPrice: 700, targetBudgetRange: { min: 500, max: 1000 } };
  const profile = { id: 'profile-1', name: 'Programação', weights: { cpu: 40, gpu: 10, ram: 25, storage: 15, costBenefit: 10 } };
  function reset(pathname = '/ready-builds', state = null, search = '') {
    fixture = {
      location: { pathname, state }, search, calls: [], navigation: [], focusCalls: [], reduceMotion: false, records: [], handlers: {},
      navigate: (...args) => fixture.navigation.push(args),
      build: { revision: 1, selectedComponents: selected, budget: { amount: 1000 }, usageType: 'gaming', actions: new Proxy({}, { get: (_, method) => (...args) => fixture.calls.push({ method, args }) }) },
      catalog: { components, componentMap: Object.fromEntries(components.map(part => [part.id, part])), loading: false, error: '', reload() {} },
      service(name, method, args) {
        fixture.calls.push({ name, method, args });
        if (fixture.handlers[`${name}.${method}`]) return fixture.handlers[`${name}.${method}`](...args);
        if (name === 'recommendationFeedbackService' && method === 'list') return Promise.resolve(fixture.records);
        if (name === 'recommendationFeedbackService' && method === 'remove') { fixture.records = fixture.records.filter(record => record.id !== args[0]); return Promise.resolve({}); }
        if (name === 'readyBuildsService') return Promise.resolve(Array.from({ length: 20 }, (_, index) => ({ ...readyBuild, id: `ready-${index}`, name: `Build pronta ${index}` })));
        if (name === 'usageProfilesService') return Promise.resolve([profile]);
        if (name === 'buildRecommendationService') return Promise.resolve([{ ...readyBuild, name: 'Sugestão de teste' }]);
        if (name === 'recommendationFeedbackService' && method === 'create') return Promise.resolve(createRecommendationFeedback(args[0]));
        return Promise.resolve([]);
      }
    };
    globalThis.__feedbackAccess = fixture;
    globalThis.window = { location: { hash: '' }, matchMedia: () => ({ matches: fixture.reduceMotion }) };
    globalThis.document = { querySelector: () => ({ getBoundingClientRect: () => ({ height: 84 }) }) };
  }
  const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  const button = (tree, label) => { const found = all(tree, node => node.type?.name === 'Button' && text(node).trim() === label)[0]; assert(found, `Missing button: ${label}`); return found; };
  const named = (tree, name) => all(tree, node => node.type?.name === name);
  const field = (tree, label) => { const found = all(tree, node => node.props?.label === label)[0]; assert(found, `Missing field: ${label}`); return found; };
  const tick = async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); };
  function runtime(Component, getProps = () => ({})) {
    const slots = []; let index = 0; let effects = [];
    const unchanged = (a, b) => a && b && a.length === b.length && a.every((value, position) => Object.is(value, b[position]));
    const hooks = {
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
      useRef(initial) { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
      useMemo(callback, deps) { const i = index++; if (!unchanged(slots[i]?.deps, deps)) slots[i] = { deps, value: callback() }; return slots[i].value; },
      useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
      useEffect(callback, deps) { const i = index++; if (!unchanged(slots[i]?.deps, deps)) { const previous = slots[i]; slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = callback(); }); } }
    };
    return {
      render() { index = 0; effects = []; globalThis.__feedbackHooks = hooks; let tree; try { tree = Component(getProps()); } finally { delete globalThis.__feedbackHooks; } effects.forEach(effect => effect()); return tree; },
      close() { slots.forEach(slot => slot?.cleanup?.()); }
    };
  }
  const markup = tree => renderToStaticMarkup(React.createElement(MemoryRouter, null, tree));
  const submit = () => ({ preventDefault() {} });
  const feedbackPayload = () => fixture.calls.find(call => call.name === 'recommendationFeedbackService' && call.method === 'create')?.args[0];
  const formProps = page => named(page.render(), 'FeedbackForm')[0].props;

  reset();
  const ready = runtime(ReadyBuilds);
  ready.render(); await tick(); let tree = ready.render();
  let html = markup(tree);
  const tabs = () => named(ready.render(), 'TaskTabs')[0];
  const panel = (tree, value) => named(tree, 'TaskPanel').find(node => node.props.value === value);
  const chooseTask = value => { tabs().props.onChange(value); return ready.render(); };
  assert.equal(tabs().props.value, 'recommend');
  assert.equal(named(tree, 'ReadyBuildCard').length, 20, 'All ready cards remain mounted');
  assert.equal(named(tree, 'UsageProfilesManager').length, 1);
  assert.equal(field(tree, 'Perfil de uso').props.options.length, 10);
  assert.match(html, /role="tablist" aria-label="Builds prontas"/);
  assert.match(html, /id="ready-build-tasks-panel-explore"[^>]+hidden=""/);
  assert.match(html, /id="ready-build-tasks-panel-profiles"[^>]+hidden=""/);
  assert.equal(panel(tree, 'recommend').props.active, true);
  assert.equal(panel(tree, 'explore').props.active, false);
  field(tree, 'Orçamento mínimo').props.onChange({ target: { value: '650' } });
  tree = chooseTask('explore');
  assert.equal(panel(tree, 'explore').props.active, true);
  assert.equal(panel(tree, 'recommend').props.active, false);
  assert.equal(named(panel(tree, 'explore'), 'ReadyBuildCard').length, 20);
  field(tree, 'Perfil de uso').props.onChange({ target: { value: 'work' } });
  await tick();
  tree = chooseTask('profiles');
  assert.equal(panel(tree, 'profiles').props.active, true);
  assert.equal(named(panel(tree, 'profiles'), 'UsageProfilesManager').length, 1);
  tree = chooseTask('recommend');
  assert.equal(field(tree, 'Orçamento mínimo').props.value, '650');
  assert.equal(field(tree, 'Perfil de uso').props.value, 'work');
  pass('Ready task tabs render exclusive accessible panels while retaining cards, filters, profile manager and entered budget');
  for (const [hash, expectedTask] of [
    ['#ready-build-catalog', 'explore'], ['#ready-build-profiles', 'profiles'],
    ['#ready-build-catalog', 'explore'], ['#ready-build-profiles', 'profiles'], ['', 'recommend']
  ]) {
    fixture.location = { ...fixture.location, hash };
    ready.render(); tree = ready.render();
    assert.equal(tabs().props.value, expectedTask, 'Same mounted route must follow fragment navigation and history restoration');
    assert.equal(panel(tree, expectedTask).props.active, true);
    assert.equal(field(tree, 'Orçamento mínimo').props.value, '650');
  }
  tree = chooseTask('profiles');
  ready.render();
  assert.equal(tabs().props.value, 'profiles', 'An unchanged fragment must not override a manual task choice');
  pass('Same-route fragment changes and restored history select the visible target without resetting input or manual task state');


  tree = chooseTask('profiles');
  const id = 'budget-recommendation';
  const target = all(tree, node => node.props?.id === id)[0];
  assert.equal(target.props.tabIndex, -1);
  assert.equal(target.props['aria-labelledby'], 'budget-recommendation-heading');
  target.props.ref.current = { style: {}, focus: options => fixture.focusCalls.push({ id, method: 'focus', options }), scrollIntoView: options => fixture.focusCalls.push({ id, method: 'scroll', options }) };
  fixture.reduceMotion = true;
  named(tree, 'UsageProfilesManager')[0].props.onApplyProfile(profile);
  tree = ready.render();
  assert.equal(tabs().props.value, 'recommend', 'Applying a profile must reveal the recommendation form before requesting focus');
  assert.equal(field(tree, 'Perfil personalizado').props.value, profile.id);
  assert.equal(field(tree, 'Tipo de uso').props.value, 'programming');
  assert.deepEqual(fixture.focusCalls.slice(-2), [{ id, method: 'focus', options: { preventScroll: true } }, { id, method: 'scroll', options: { behavior: 'auto', block: 'start' } }]);
  assert.equal(target.props.ref.current.style.scrollMarginTop, '100px');
  pass('Applying a profile switches to the recommendation task, retains inferred criteria and requests reduced-motion focus with header clearance');

  field(tree, 'Orçamento mínimo').props.onChange({ target: { value: '500' } });
  field(ready.render(), 'Orçamento máximo').props.onChange({ target: { value: '1000' } });
  tree = ready.render();
  await all(tree, node => node.type === 'form')[0].props.onSubmit(submit());
  tree = ready.render();
  assert.equal(named(tree, 'RecommendationResultCard').length, 1);
  assert.deepEqual(fixture.calls.find(call => call.name === 'buildRecommendationService').args[0], { budgetRange: { min: 500, max: 1000 }, usageType: 'programming', priority: 'balanced' });
  tree = chooseTask('explore');
  tree = chooseTask('recommend');
  assert.equal(named(tree, 'RecommendationResultCard').length, 1, 'Switching tasks must retain the accepted result');
  ready.close();
  pass('Moved budget form still submits selected criteria and renders accepted recommendations');

  reset('/feedback');
  fixture.records = [{ id: 'feedback-record', recommendationType: 'ready-build', rating: 4, comment: 'Registro de teste', buildSnapshot: Object.fromEntries(types.map(type => [`${type}Id`, selected[type].id])), wouldFollowRecommendation: true }];
  const history = runtime(Feedback);
  history.render(); await tick();
  const centralProps = () => named(history.render(), 'CentralFeedback')[0].props;
  const central = runtime(CentralFeedback, centralProps);
  tree = central.render(); html = markup(tree);
  assert(html.indexOf('Registro de teste') < html.indexOf('<summary>Resumo das avaliações</summary>'), 'Records must precede optional metrics');
  const metrics = all(tree, node => node.type === 'details')[0];
  assert(metrics && !metrics.props.open);
  assert(html.includes('href="/feedback/new?type=general"'));
  const linkedParts = named(tree, 'FeedbackBuildSnapshot')[0];
  assert(markup(linkedParts).includes('<summary>Ver peças vinculadas</summary>'));
  assert(!/<details[^>]*\bopen/.test(markup(linkedParts)), 'Linked parts start collapsed without losing the snapshot');
  assert.equal(field(tree, 'Filtrar por tipo').props.options.length, 7);
  field(tree, 'Filtrar por tipo').props.onChange({ target: { value: 'ready-build' } });
  history.render(); await tick(); tree = central.render();
  assert.deepEqual(fixture.calls.filter(call => call.name === 'recommendationFeedbackService' && call.method === 'list').at(-1).args, [{ recommendationType: 'ready-build' }]);
  button(tree, 'Usar build inteira e ir para resumo').props.onClick();
  const applied = fixture.calls.find(call => call.method === 'applyRecommendation');
  assert.deepEqual(applied.args[1], { replaceCooling: true });
  for (const type of types) assert.equal(applied.args[0].components[type].id, selected[type].id);
  assert.deepEqual(fixture.navigation.at(-1), ['/summary']);
  fixture.handlers['recommendationFeedbackService.remove'] = async () => { throw new Error('Remoção indisponível'); };
  await button(central.render(), 'Remover feedback').props.onClick();
  assert(markup(history.render()).includes('Remoção indisponível'));
  assert.equal(centralProps().feedbacks.length, 1, 'Failed deletion must retain the record');
  delete fixture.handlers['recommendationFeedbackService.remove'];
  await button(central.render(), 'Remover feedback').props.onClick();
  assert.equal(centralProps().feedbacks.length, 0);
  assert(markup(central.render()).includes('Nenhuma avaliação registrada ainda'));
  central.close(); history.close();
  pass('Feedback opens with records before optional metrics and preserves filtering, whole-build/cooling apply, deletion failure and retry');

  for (const search of ['?type=general', '?type=ready-build&recommendationId=orphan']) {
    reset('/feedback/new', null, search);
    const page = runtime(Feedback);
    tree = page.render(); html = markup(tree);
    for (const absent of ['Você seguiria esta recomendação?', 'Continuar com esta recomendação', 'Resumo da recomendação', 'Tipo de recomendação']) assert(!html.includes(absent), `General feedback must not display: ${absent}`);
    assert(html.includes('experiência com o PCPowerLab'));
    assert(html.includes('Continuar explorando o PCPowerLab'));
    const form = runtime(FeedbackForm, () => formProps(page));
    tree = form.render();
    field(tree, 'Nota').props.onChange({ target: { value: '0' } });
    await all(form.render(), node => node.type === 'form')[0].props.onSubmit(submit());
    assert(markup(page.render()).includes('Informe uma nota entre 1 e 5'));
    assert.equal(feedbackPayload(), undefined, 'Invalid rating must not reach the API');
    field(form.render(), 'Nota').props.onChange({ target: { value: '4' } });
    all(form.render(), node => node.type === 'textarea')[0].props.onChange({ target: { value: '  Fácil de usar  ' } });
    await all(form.render(), node => node.type === 'form')[0].props.onSubmit(submit());
    assert.deepEqual(feedbackPayload(), { recommendationType: 'general', rating: 4, comment: 'Fácil de usar' });
    assert.equal(fixture.navigation.at(-1)[0], '/feedback');
    form.close(); page.close();
  }
  pass('General and orphaned feedback render project language and submit rating/comment without fabricated recommendation intent/context');

  reset('/feedback/new', { mode: 'contextual', recommendationType: 'ready-build', recommendationId: readyBuild.id, recommendationTitle: readyBuild.name, source: 'ready-build', build: selected });
  const contextual = runtime(Feedback);
  tree = contextual.render(); html = markup(tree);
  for (const expected of ['Você seguiria esta recomendação?', 'Continuar com esta recomendação', 'Resumo da recomendação', 'Usar esta build inteira']) assert(html.includes(expected), `Contextual feedback retains: ${expected}`);
  const secondary = all(tree, node => node.type === 'details' && markup(node).includes('<summary>Outras ações</summary>'))[0];
  assert(secondary && !secondary.props.open, 'Secondary apply/save actions must start collapsed');
  assert(markup(secondary).includes('Usar esta build inteira'));
  assert(markup(secondary).includes('Salvar build'));
  const recommendationSummary = named(tree, 'RecommendationSummary')[0];
  assert(markup(recommendationSummary).includes('<summary>Ver peças da recomendação</summary>'));
  assert(!/<details[^>]*\bopen/.test(markup(recommendationSummary)), 'Recommendation parts start collapsed');
  button(tree, 'Usar build inteira e ir para resumo').props.onClick();
  const appliedContext = fixture.calls.find(call => call.method === 'applyRecommendation');
  assert.deepEqual(appliedContext.args[1], { replaceCooling: true });
  assert.deepEqual(fixture.navigation.at(-1), ['/summary']);
  assert(html.includes('configuração inteira avaliada, incluindo refrigeração'), 'Whole-build replacement warning must remain visible');
  const contextualForm = runtime(FeedbackForm, () => formProps(contextual));
  field(contextualForm.render(), 'Você seguiria esta recomendação?').props.onChange({ target: { value: 'false' } });
  await all(contextualForm.render(), node => node.type === 'form')[0].props.onSubmit(submit());
  assert.equal(feedbackPayload().wouldFollowRecommendation, false);
  assert.equal(feedbackPayload().recommendationType, 'ready-build');
  assert.equal(feedbackPayload().recommendationId, readyBuild.id);
  for (const type of types) assert.equal(feedbackPayload().buildSnapshot[`${type}Id`], selected[type].id);
  contextualForm.close(); contextual.close();
  pass('Contextual feedback retains recommendation question/actions and submits linked build plus explicit follow intent');
  console.log('LIMITATION: SSR/isolated handlers do not establish visual position, real DOM focus/scroll, browser history, or keyboard behavior');
} finally {
  clearRecommendationFeedbackForTests();
  Object.assign(globalThis, originals);
  delete globalThis.__feedbackAccess;
  delete globalThis.__feedbackHooks;
  await rm(directory, { recursive: true, force: true });
}
