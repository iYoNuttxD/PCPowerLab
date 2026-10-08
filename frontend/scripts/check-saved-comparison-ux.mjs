// Source handlers + SSR only. Native focus, layout and scrolling need browser QA.
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(frontend, 'package.json'));
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-saved-comparison-ux-'));
try {
  const output = join(temporary, 'checks.mjs');
  await build({
    stdin: { resolveDir: frontend, loader: 'jsx', contents: `
      export { default as React } from 'react';
      export { renderToStaticMarkup } from 'react-dom/server';
      export { MemoryRouter } from 'react-router-dom';
      export { default as CompareBuilds } from './src/pages/CompareBuilds.jsx';
      export { default as SharedBuild } from './src/pages/SharedBuild.jsx';` },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'comparison-ux-fixtures', setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'fixture' }));
      builder.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'fixture' }));
      builder.onResolve({ filter: /\/hooks\/use(BuildState|Components)\.(js|jsx)$/ }, args => ({ path: basename(args.path), namespace: 'fixture' }));
      builder.onResolve({ filter: /\/services\/.*Service\.js$/ }, args => ({ path: basename(args.path, '.js'), namespace: 'service' }));
      builder.onLoad({ filter: /.*/, namespace: 'service' }, ({ path }) => ({ contents: `export const ${path} = new Proxy({}, {get: (_, method) => (...args) => globalThis.__comparisonUX.services[${JSON.stringify(path)}][method](...args)});` }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ resolveDir: frontend, contents: path === 'react'
        ? `import * as Real from ${JSON.stringify(require.resolve('react'))}; export * from ${JSON.stringify(require.resolve('react'))}; export default Real.default; ${['useState', 'useRef', 'useEffect'].map(name => `export const ${name} = (...args) => globalThis.__comparisonUXHooks ? globalThis.__comparisonUXHooks.${name}(...args) : Real.${name}(...args);`).join('\n')}`
        : path === 'router' ? `export * from ${JSON.stringify(require.resolve('react-router-dom'))}; export const useParams = () => globalThis.__comparisonUX.params;`
          : path.startsWith('useBuildState') ? 'export const useBuildState = () => globalThis.__comparisonUX.build;'
            : 'export const useCatalogComponent = component => ({ component: typeof component === "object" ? component : null, loading: false, error: "" });' }));
    }}]
  });
  const { React, renderToStaticMarkup, MemoryRouter, CompareBuilds, SharedBuild } = await import(pathToFileURL(output).href);
  const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  const label = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(label).join('') : node?.props ? label(node.props.children) : '';
  const named = (tree, name) => all(tree, node => node.type?.name === name);
  const button = (tree, text) => { const result = named(tree, 'Button').find(node => label(node).trim() === text); assert(result, `Missing button: ${text}`); return result; };
  const render = tree => renderToStaticMarkup(React.createElement(MemoryRouter, null, tree));
  const tick = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
  function runtime(Component) {
    const slots = []; let index = 0, effects = [];
    const same = (a, b) => a && b && a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
    const hooks = {
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
      useRef(initial) { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
      useEffect(callback, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) { const previous = slots[i]; slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = callback(); }); } }
    };
    return {
      render() { index = 0; effects = []; globalThis.__comparisonUXHooks = hooks; let tree; try { tree = Component(); } finally { delete globalThis.__comparisonUXHooks; } effects.forEach(effect => effect()); return tree; },
      close() { slots.forEach(slot => slot?.cleanup?.()); }
    };
  }
  const components = Object.fromEntries(['cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'case'].map(category => [category, { id: `${category}-test`, name: `${category} de teste`, category, price: 100 }]));
  const fixture = globalThis.__comparisonUX = {
    build: { selectedComponents: components, buildPayload: components, budget: { amount: 5000 }, usageType: 'gaming' },
    params: { shareId: 'share-first' },
    services: {
      savedBuildsService: { list: async () => [{ id: 'saved-a', name: 'Build salva', components, totalEstimatedPrice: null }] },
      buildComparisonService: { compare: async () => ({
        recommendedBuild: { available: false, reason: 'Preços ausentes impedem a classificação de custo.' },
        builds: [
          { comparisonIndex: 0, name: 'Montagem atual', totalEstimatedPrice: null, compatible: false, compatibilityStatus: 'unverified', unverifiedChecks: [{ code: 'bios', message: 'Confira a BIOS' }], performanceScore: null, costBenefitScore: null, comparisonScore: null, budgetStatus: 'unknown' },
          { comparisonIndex: 1, name: 'Build salva', totalEstimatedPrice: 700, compatible: false, compatibilityStatus: 'incompatible', performanceScore: 0, performanceBasis: 'simulated', costBenefitScore: 0, comparisonScore: 0, budgetStatus: 'within_budget', alertSummary: { total: 1 }, bottleneckStatus: 'unavailable' }
        ]
      }) },
      sharingService: { get: async () => ({ name: 'Compartilhada', buildId: 'saved-a', buildSummary: { totalEstimatedPrice: null, components, finalRecommendation: 'Confirme as especificações antes da compra.' } }) }
    }
  };
  const comparison = runtime(CompareBuilds); comparison.render(); await tick(); let tree = comparison.render();
  const markup = render(tree);
  assert(markup.indexOf('comparison-selection') < markup.indexOf('comparison-controls'), 'Build selection must precede criteria and run');
  assert(markup.indexOf('comparison-controls') < markup.indexOf('Como interpretar os resultados'), 'Optional methodology follows useful controls');
  assert(button(tree, 'Comparar selecionadas').props.disabled);
  assert(markup.includes('1 configuração(ões) selecionada(s)'));
  assert(markup.includes('Preço indisponível'));
  button(tree, 'Selecionar').props.onClick(); tree = comparison.render();
  assert(!button(tree, 'Comparar selecionadas').props.disabled);
  assert(label(tree).includes('2 configuração(ões) selecionada(s)'));
  await button(tree, 'Comparar selecionadas').props.onClick(); tree = comparison.render();
  const table = all(tree, node => node.type === 'table')[0];
  assert(table); assert.equal(all(table, node => node.type === 'th' && node.props.scope === 'col').length, 8);
  const resultMarkup = render(tree);
  for (const expected of ['Comparação de custo pendente', 'Preços ausentes impedem', 'Confira a BIOS', 'Não verificada', 'Incompatível', 'Preço indisponível', 'Não disponível', '0 / 100', 'Pontuação simulada', 'Gargalos: sem conclusão']) assert(resultMarkup.includes(expected), expected);
  assert(!resultMarkup.includes('alert-success'), 'Unavailable cost ranking must not appear successful');
  assert(all(tree, node => node.props?.className === 'comparison-table')[0].props.tabIndex === 0);
  comparison.close();
  console.log('PASS: selections precede compact criteria and optional help; all eight result columns, unknown/incompatible/price states and simulated zero scores survive');

  const shared = runtime(SharedBuild); tree = shared.render();
  assert(label(tree).includes('share-first')); assert(label(tree).includes('Somente leitura'));
  assert(!label(tree).includes('Total estimado de referência'), 'Loading cannot expose an earlier total');
  await tick(); tree = shared.render();
  let sharedMarkup = render(tree);
  for (const expected of ['Compartilhada', 'share-first', 'saved-a', 'Preço indisponível', 'Compatibilidade não verificada', 'não inclui uma análise', 'Confirme as especificações']) assert(sharedMarkup.includes(expected), expected);
  assert.equal(all(tree, node => node.type === 'li').length, 7);
  assert(!sharedMarkup.includes('Build compatível'));
  assert.equal(named(tree, 'Button').length, 0, 'Shared success view stays read-only');
  fixture.params = { shareId: 'share-retry' };
  fixture.services.sharingService.get = async () => { throw new Error('Compartilhamento indisponível'); };
  tree = shared.render(); assert(label(tree).includes('share-retry')); assert(!label(tree).includes('Compartilhada'));
  await tick(); tree = shared.render();
  assert(label(tree).includes('share-retry')); assert.equal(named(tree, 'ErrorState')[0].props.message, 'Compartilhamento indisponível');
  fixture.services.sharingService.get = async () => ({ name: 'Recuperada', buildSummary: { components, totalEstimatedPrice: 700, compatibility: { status: 'compatible', compatible: true, alerts: [] } } });
  named(tree, 'ErrorState')[0].props.onRetry(); shared.render(); await tick(); tree = shared.render();
  sharedMarkup = render(tree);
  assert(sharedMarkup.includes('Recuperada')); assert(sharedMarkup.includes('Build compatível')); assert(sharedMarkup.includes('share-retry'));
  shared.close();
  for (const compatibility of [null, {}, [], 'compatible', { status: 'unknown' }, { compatible: 'true' }]) {
    fixture.services.sharingService.get = async () => ({ buildSummary: { components, compatibility } });
    const absent = runtime(SharedBuild); absent.render(); await tick(); const absentMarkup = render(absent.render());
    assert(absentMarkup.includes('não inclui uma análise de compatibilidade'), JSON.stringify(compatibility));
    assert(!absentMarkup.includes('incompatibilidades encontradas')); assert(!absentMarkup.includes('Build compatível'));
    absent.close();
  }
  for (const [status, expected] of [['compatible', 'Build compatível'], ['unverified', 'Compatibilidade não verificada'], ['incompatible', 'incompatibilidades encontradas']]) {
    fixture.services.sharingService.get = async () => ({ buildSummary: { components, compatibility: { status } } });
    const recognized = runtime(SharedBuild); recognized.render(); await tick(); const recognizedMarkup = render(recognized.render());
    assert(recognizedMarkup.includes(expected), status); assert(!recognizedMarkup.includes('não inclui uma análise'));
    recognized.close();
  }
  console.log('PASS: null, empty and malformed shared evidence is unverified; recognized compatibility-only statuses retain their meaning');
  console.log('PASS: read-only shared identity persists through loading/error/retry; missing evidence stays distinct from verified compatibility and seven parts stay visible');
  console.log('LIMITATION: source/SSR only; native keyboard focus, layout, screenshots and E2E remain unverified');
} finally {
  delete globalThis.__comparisonUX; delete globalThis.__comparisonUXHooks;
  await rm(temporary, { recursive: true, force: true });
}
