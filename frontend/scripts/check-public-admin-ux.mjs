// Source, actual-page handler and React SSR checks. No browser/layout claim.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(frontend, 'package.json'));
const realReact = require.resolve('react');
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-public-admin-'));
const output = join(temporary, 'check.mjs');
let groups = 0;
const pass = text => console.log(`PASS ${++groups}: ${text}`);
const defaultBuild = { selectedComponents: { fans: [] }, wizardStep: 'cpu', budget: { amount: '' } };

try {
  await build({
    stdin: { resolveDir: frontend, loader: 'jsx', contents: `
      export { default as React } from 'react';
      export { renderToStaticMarkup } from 'react-dom/server';
      export { MemoryRouter } from 'react-router-dom';
      export { default as Home } from './src/pages/Home.jsx';
      export { default as Admin } from './src/pages/Admin.jsx';
      export { default as About } from './src/pages/About.jsx';
      export { default as NotFound } from './src/pages/NotFound.jsx';
      export { default as ImageCredits, ImageCredit } from './src/pages/ImageCredits.jsx';
      export { default as Insights, RankingList } from './src/pages/Insights.jsx';
    ` },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'public-admin-fixtures', setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'fixture-react' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture-react' }, () => ({ contents: `
        import * as Real from ${JSON.stringify(realReact)};
        export * from ${JSON.stringify(realReact)};
        export default Real.default;
        export const useState = (...args) => globalThis.__pageHooks ? globalThis.__pageHooks.useState(...args) : Real.useState(...args);
        export const useEffect = (...args) => globalThis.__pageHooks ? globalThis.__pageHooks.useEffect(...args) : Real.useEffect(...args);
      `, resolveDir: frontend }));
      builder.onResolve({ filter: /\/hooks\/useBuildState\.jsx$/ }, () => ({ path: 'build', namespace: 'fixture-build' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture-build' }, () => ({ contents: 'export const useBuildState = () => globalThis.__fixtureBuild;' }));
      builder.onResolve({ filter: /\/hooks\/useComponents\.js$/ }, () => ({ path: 'catalog', namespace: 'fixture-catalog' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture-catalog' }, () => ({ contents: `
        export const useComponents = () => globalThis.__fixtureCatalog;
        export const useCatalogComponent = component => ({ component, loading: false });
      ` }));
      builder.onResolve({ filter: /\/services\/adminService\.js$/ }, () => ({ path: 'admin', namespace: 'fixture-admin' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture-admin' }, () => ({ contents: 'export const adminService = new Proxy({}, { get: (_, key) => (...args) => globalThis.__fixtureAdmin[key](...args) });' }));
      builder.onResolve({ filter: /\/services\/costBenefitService\.js$/ }, () => ({ path: 'ranking', namespace: 'fixture-ranking' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture-ranking' }, () => ({ contents: 'export const costBenefitService = { listComponents: () => globalThis.__fixtureRanking() };' }));
      builder.onLoad({ filter: /\/pages\/Insights\.jsx$/ }, async ({ path }) => ({ contents: `${await readFile(path, 'utf8')}\nexport { RankingList };`, loader: 'jsx' }));
    } }]
  });
  const { React, renderToStaticMarkup, MemoryRouter, Home, Admin, About, NotFound, ImageCredits, ImageCredit, Insights, RankingList } = await import(pathToFileURL(output).href);
  const render = (Component, props) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)));
  const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  const one = (tree, predicate) => { const nodes = all(tree, predicate); assert.equal(nodes.length, 1); return nodes[0]; };
  const field = (tree, label) => one(tree, node => node.props?.label === label);
  const button = (tree, label) => one(tree, node => node.type?.name === 'Button' && node.props.children === label);
  const formWith = (tree, name) => one(tree, node => node.type === 'form' && all(node, child => child.props?.name === name).length > 0);
  const task = (tree, value) => one(tree, node => node.type?.name === 'TaskPanel' && node.props.value === value);
  const html = page => renderToStaticMarkup(React.createElement(MemoryRouter, null, page.render()));
  const tick = async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); };
  function runtime(Component) {
    const slots = []; let index = 0, effects = [], dirty = false;
    const hooks = {
      useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[slot].value, value => { slots[slot].value = typeof value === 'function' ? value(slots[slot].value) : value; dirty = true; }]; },
      useEffect(callback, dependencies) { const slot = index++; const old = slots[slot]; if (!old || dependencies?.some((value, position) => !Object.is(value, old.dependencies[position]))) { slots[slot] = { dependencies }; effects.push(callback); } }
    };
    return { render() { let tree, cycles = 0; do {
      assert(cycles++ < 25, 'Hooks did not settle'); index = 0; effects = []; dirty = false;
      globalThis.__pageHooks = hooks;
      try { tree = Component(); } finally { delete globalThis.__pageHooks; }
      effects.forEach(effect => effect());
    } while (dirty); return tree; }, async settle() { await tick(); this.render(); await tick(); return this.render(); } };
  }

  globalThis.__fixtureBuild = defaultBuild;
  let markup = render(Home);
  assert.match(markup, /Montar meu PC/);
  for (const href of ['/build', '/components', '/ready-builds']) assert(markup.includes(`href="${href}"`));
  assert.match(markup, /<section class="hero">/);
  assert.match(markup, /<h1>PCPowerLab<\/h1>/);
  assert.match(markup, /class="hero-console" aria-hidden="true"/);
  assert.match(markup, /class="console-screen"/);
  assert.match(markup, /<strong>PC<\/strong>/);
  assert.match(markup, /Exemplo ilustrativo/);
  assert.match(markup, /class="scan-lines"/);
  assert(!markup.includes('98%'));
  assert.match(markup, /class="feature-grid" aria-label="Benefícios"/);
  for (const title of ['Compatibilidade', 'Desempenho', 'Recomendações', 'Resumo claro']) assert(markup.includes(`<h2>${title}</h2>`));
  for (const description of ['Valide socket, memória, gabinete, fonte', 'Simule jogos, gargalos e equilíbrio', 'Receba sugestões por orçamento, uso', 'Transforme dados técnicos em explicações simples']) assert(markup.includes(description));
  assert(!markup.includes('home-task-hero') && !markup.includes('home-feature-list'));
  for (const change of [
    { selectedComponents: { cpu: { id: 'cpu' }, fans: [] } },
    { selectedComponents: { fans: [{ id: 'fan', quantity: 1 }] } },
    { selectedComponents: { cooler: { id: 'cooler' }, fans: [] } },
    { wizardStep: 'gpu' }, { budget: { amount: 4000 } }
  ]) {
    globalThis.__fixtureBuild = { ...defaultBuild, ...change };
    markup = render(Home);
    assert.match(markup, /Continuar montagem/);
    assert(!markup.includes('Montar meu PC'));
  }
  assert(markup.indexOf('href="/build"') < markup.indexOf('feature-grid'));
  pass('Home restores the original hero, illustrative console and four descriptive cards while preserving all destinations and progress-aware entry');

  const calls = [];
  const rules = [{ id: 'r1', name: 'Regra de socket', sourceType: 'cpu', targetType: 'motherboard', severity: 'low' }];
  const parameters = [{ componentId: 'cpu-fixture', type: 'cpu', performanceScore: 100 }];
  globalThis.__fixtureAdmin = {
    session: async () => ({ authenticated: false }),
    unlock: async password => { calls.push(['unlock', password]); },
    logout: async () => { calls.push(['logout']); },
    listRules: async () => rules, listParameters: async () => parameters,
    createRule: async payload => calls.push(['createRule', payload]),
    updateRule: async (id, payload) => calls.push(['updateRule', id, payload]),
    deleteRule: async id => calls.push(['deleteRule', id]),
    createParameter: async payload => calls.push(['createParameter', payload]),
    updateParameter: async (id, payload) => calls.push(['updateParameter', id, payload]),
    deleteParameter: async id => calls.push(['deleteParameter', id])
  };
  const page = runtime(Admin);
  assert(html(page).includes('Verificando acesso administrativo'));
  await page.settle();
  assert.equal(field(page.render(), 'Senha de acesso').props.type, 'password');
  assert.equal(field(page.render(), 'Senha de acesso').props.autoComplete, 'current-password');
  assert(!html(page).includes('TaskPanel') && !html(page).includes('role="tabpanel"'));
  field(page.render(), 'Senha de acesso').props.onChange({ target: { value: 'local-fixture-only' } });
  await formWith(page.render(), 'password').props.onSubmit({ preventDefault() {} });
  await page.settle();
  assert.deepEqual(calls.shift(), ['unlock', 'local-fixture-only']);
  assert(!html(page).includes('local-fixture-only'));
  assert.equal(task(page.render(), 'rules').props.active, true);
  assert.equal(task(page.render(), 'parameters').props.active, false);
  const tabs = () => one(page.render(), node => node.type?.name === 'TaskTabs');
  markup = html(page);
  assert(markup.indexOf('não executam nem controlam a compatibilidade') < markup.indexOf('role="tablist"'));
  assert(markup.indexOf('Regra de socket') < markup.indexOf('<summary>Adicionar regra'));
  assert(markup.indexOf('cpu-fixture') < markup.indexOf('<summary>Adicionar parâmetro'));
  assert.match(markup, /id="admin-tasks-tab-rules"[^>]+aria-controls="admin-tasks-panel-rules"[^>]+aria-selected="true"/);
  assert.match(markup, /id="admin-tasks-panel-parameters"[^>]+hidden=""/);
  assert(!/<details[^>]*\bopen/.test(markup));
  pass('Admin gates controls behind authentication and keeps documentary warning, logout, lists and collapsed add forms in task-first order');

  field(page.render(), 'Buscar regra').props.onChange({ target: { value: 'missing' } });
  assert(html(page).includes('Nenhuma regra encontrada.'));
  tabs().props.onChange('parameters');
  assert.equal(task(page.render(), 'parameters').props.active, true);
  assert.equal(task(page.render(), 'rules').props.active, false);
  tabs().props.onChange('rules');
  assert.equal(field(page.render(), 'Buscar regra').props.value, 'missing');
  field(page.render(), 'Buscar regra').props.onChange({ target: { value: '' } });
  const score = field(page.render(), 'Pontuação simulada');
  assert.equal(score.props.min, '0'); assert.equal(score.props.max, '100'); assert(score.props.required);
  assert(score.props['aria-describedby'].includes('admin-score-scope') && score.props['aria-describedby'].includes('admin-cooling-scope'));
  const parameterForm = formWith(page.render(), 'performanceScore');
  const type = field(parameterForm, 'Tipo');
  assert(!type.props.options.some(option => ['cooler', 'fan', 'fans'].includes(option.value)));
  const parameterDetails = one(page.render(), node => node.type === 'details' && all(node, child => child.props?.name === 'performanceScore').length > 0);
  const detailsText = renderToStaticMarkup(React.createElement(MemoryRouter, null, parameterDetails));
  for (const text of ['0 a 100 pontos', 'sem benchmark medido', 'não equivalem a FPS', 'porcentagem de velocidade', 'Coolers e ventoinhas']) assert(detailsText.includes(text), text);
  pass('Admin task switching retains search and both mounted forms; exact score units/range and cooling exclusion remain attached to entry');

  const NativeFormData = globalThis.FormData;
  let resets = 0;
  globalThis.FormData = class { constructor(form) { this.values = form.values; } get(name) { return this.values[name]; } };
  try {
    await formWith(page.render(), 'message').props.onSubmit({ preventDefault() {}, currentTarget: { values: { name: 'N'.repeat(110), sourceType: 'cpu', targetType: 'motherboard', field: 'socket', targetField: '', operator: 'equals', severity: 'high', message: 'Confira.' }, reset() { resets++; } } });
    await formWith(page.render(), 'performanceScore').props.onSubmit({ preventDefault() {}, currentTarget: { values: { componentId: 'cpu-fixture', type: 'cpu', performanceScore: '0' }, reset() { resets++; } } });
  } finally { globalThis.FormData = NativeFormData; }
  assert.equal(resets, 2);
  assert.equal(calls.find(call => call[0] === 'createRule')[1].name.length, 100);
  assert.equal(calls.find(call => call[0] === 'createRule')[1].targetField, 'socket');
  assert.deepEqual(calls.find(call => call[0] === 'createParameter')[1], { componentId: 'cpu-fixture', type: 'cpu', performanceScore: 0 });
  await button(page.render(), 'Marcar como alta').props.onClick();
  await button(page.render(), '+1 ponto').props.onClick();
  await button(task(page.render(), 'rules'), 'Remover').props.onClick();
  await button(task(page.render(), 'parameters'), 'Remover').props.onClick();
  assert.deepEqual(calls.find(call => call[0] === 'updateParameter'), ['updateParameter', 'cpu-fixture', { performanceScore: 100 }]);
  assert.equal(calls.find(call => call[0] === 'updateRule')[2].active, true);
  assert(calls.some(call => call[0] === 'deleteRule' && call[1] === 'r1'));
  assert(calls.some(call => call[0] === 'deleteParameter' && call[1] === 'cpu-fixture'));
  await button(page.render(), 'Sair').props.onClick();
  assert.equal(field(page.render(), 'Senha de acesso').props.value, '');
  assert(!html(page).includes('Regra de socket') && !html(page).includes('cpu-fixture'));
  pass('Rule/parameter create, reset, bounds, update, delete and logout handlers retain their existing payload contracts');

  globalThis.__fixtureAdmin.session = async () => ({ authenticated: true });
  const expired = runtime(Admin); expired.render(); await expired.settle();
  globalThis.__fixtureAdmin.updateParameter = async () => { throw Object.assign(new Error('Expired'), { status: 401 }); };
  await button(expired.render(), '+1 ponto').props.onClick();
  assert(html(expired).includes('A sessão expirou. Digite a senha novamente.'));
  assert(!html(expired).includes('role="tabpanel"'));
  pass('A protected action returning 401 still returns to the password form and hides administrative content');

  const ranking = [
    { component: { id: 'gpu-1', category: 'gpu', name: 'GPU de referência', price: 400 }, categoryRank: 4, performanceScore: 0, costBenefitScore: 0, performanceBasis: 'simulated' },
    { component: { id: 'cpu-1', category: 'cpu', name: 'CPU de referência', price: 800 }, categoryRank: 1, performanceScore: 80, costBenefitScore: 100 },
    { component: { id: 'gpu-2', category: 'gpu', name: 'GPU sem dados', price: null }, performanceScore: null, costBenefitScore: null }
  ];
  markup = render(RankingList, { ranking });
  assert.equal((markup.match(/class="ranking-category"/g) || []).length, 2);
  assert(markup.indexOf('GPU sem dados') < markup.indexOf('CPU de referência'), 'Categories stay together');
  for (const text of ['Posição 4 na categoria', 'Posição na categoria não disponível', 'Pontuação simulada', '0 / 100', 'Preço indisponível', 'Nota de custo-benefício indisponível']) assert(markup.includes(text), text);
  globalThis.__fixtureRanking = async () => ranking;
  const insights = runtime(Insights); insights.render(); await insights.settle();
  markup = html(insights);
  assert(markup.indexOf('>Categoria</label>') < markup.indexOf('GPU de referência'));
  assert(markup.indexOf('GPU de referência') < markup.indexOf('Metodologia do ranking'));
  assert(markup.indexOf('Índice relativo à categoria') < markup.indexOf('GPU de referência'));
  for (const text of ['preço de referência', 'Coolers e ventoinhas não participam', 'Pontos não equivalem a FPS', 'melhor relação de cada categoria recebe 100']) assert(markup.includes(text), text);
  pass('Insights leads with category/results, separates category ranks, preserves simulated zero/unknowns and makes full methodology discoverable');

  const media = { componentId: 'credit-id', status: 'verified', imageType: 'photo', imagePath: '/images/components/fixture.webp', lastVerifiedAt: '2026-10-08', imageSource: 'https://example.org/source', manufacturerProductUrl: 'https://example.org/model', author: 'Fixture author', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', modifications: 'Redimensionada' };
  const credited = { id: 'credit-id', name: 'Componente creditado', image: media };
  markup = render(ImageCredit, { component: credited });
  assert(markup.includes('id="credit-id"'));
  for (const value of [media.author, media.imageSource, media.manufacturerProductUrl, media.license, media.licenseUrl, media.modifications]) assert(markup.includes(value));
  globalThis.__fixtureCatalog = { allComponents: [credited], loading: false, error: '', reload() {} };
  assert(render(ImageCredits).includes('href="/images/components/ATTRIBUTION.md"'));
  globalThis.__fixtureCatalog = { ...globalThis.__fixtureCatalog, loading: true };
  assert(render(ImageCredits).includes('Carregando créditos'));
  globalThis.__fixtureCatalog = { ...globalThis.__fixtureCatalog, loading: false, error: 'Falha de catálogo' };
  assert(render(ImageCredits).includes('Tentar novamente') && render(ImageCredits).includes('Falha de catálogo'));
  markup = render(About);
  assert(markup.indexOf('Da escolha à montagem') < markup.indexOf('Como interpretar os resultados'));
  for (const text of ['informações ausentes', 'sem benchmark medido', 'BIOS']) assert(markup.includes(text));
  markup = render(NotFound);
  assert.equal((markup.match(/<a /g) || []).length, 1);
  assert(markup.includes('href="/"') && markup.includes('Voltar ao início'));
  pass('Credits preserve exact fragments/attribution/license links and recovery; About retains limitations; unknown routes have one recovery');
  console.log(`Public/Admin UX: ${groups} source + handler + SSR groups passed. Browser focus, responsiveness and rendered layout remain unverified.`);
} finally {
  for (const key of ['__pageHooks', '__fixtureBuild', '__fixtureAdmin', '__fixtureCatalog', '__fixtureRanking']) delete globalThis[key];
  await rm(temporary, { recursive: true, force: true });
}
