import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { recommendBuildByBudget } from '../../src/services/recommendationService.js';
import { generateBuildSummary } from '../../src/services/buildSummaryService.js';
import { currentBuild } from '../../tests/helpers/current-build.js';

let temporary, modules, recommendation;
before(async () => {
  const frontend = fileURLToPath(new URL('..', import.meta.url));
  temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-explanation-ssr-'));
  const output = join(temporary, 'render.mjs');
  await build({ stdin: { resolveDir: resolve(frontend), loader: 'jsx', contents: `
    export { default as React } from 'react';
    export { MemoryRouter } from 'react-router-dom';
    export { renderToStaticMarkup } from 'react-dom/server';
    export { ComponentsProvider } from './src/hooks/useComponents.js';
    export { default as RecommendationExplanation } from './src/components/recommendations/RecommendationExplanation.jsx';
    export { default as RecommendationCard } from './src/components/recommendations/RecommendationCard.jsx';
    export { RecommendationResultCard } from './src/pages/ReadyBuilds.jsx';
  ` }, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  plugins: [{ name: 'expose-result-card', setup(builder) {
    builder.onLoad({ filter: /\/pages\/ReadyBuilds\.jsx$/ }, async ({ path }) => ({
      contents: await readFile(path, 'utf8') + '\nexport { RecommendationResultCard };', loader: 'jsx'
    }));
  } }] });
  modules = await import(pathToFileURL(output).href);
  recommendation = recommendBuildByBudget({ budget: { amount: 10000 }, usageType: 'gaming' });
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });
const render = (name, props) => modules.renderToStaticMarkup(modules.React.createElement(modules.MemoryRouter, null,
  modules.React.createElement(modules.ComponentsProvider, null, modules.React.createElement(modules[name], props))));

test('SSR: recommendation explanations render all parts as collapsed native disclosures, with facts and tradeoffs', () => {
  const html = render('RecommendationCard', { recommendation });
  assert.match(html, /Por que estas peças\? Custos, perfil e alternativas/);
  assert.equal((html.match(/class="recommendation-component-reason"/g) || []).length, 7);
  assert.doesNotMatch(html, /<details[^>]*open=/);
  for (const reason of recommendation.selectionExplanation.componentReasons) {
    assert.ok(html.includes(reason.name));
    assert.ok(html.includes(reason.profile.message));
  }
  assert.match(html, /opções elegíveis da categoria/);
  assert.match(html, /não um percentual de desempenho real/);
  assert.match(html, /não cotações ao vivo/);
  assert.match(html, /Não garante ótimo global/);
});

test('SSR: excluded new CPUs have a readable pending-BIOS explanation, not hidden eligibility', () => {
  const html = render('RecommendationExplanation', { explanation: recommendation.selectionExplanation });
  assert.match(html, /Por que outras peças não servem como troca direta/);
  assert.match(html, /AMD Ryzen 7 7800X3D/);
  assert.doesNotMatch(html, /BIOS instalado ou versão mínima/);
  assert.match(html, /Não significa que estes modelos sejam incompatíveis com todas as montagens/);
});

test('SSR: range recommendation card renders the same evidence-based explanation', () => {
  const componentMap = Object.fromEntries(Object.values(recommendation.components).map(component => [component.id, component]));
  const html = render('RecommendationResultCard', { recommendation, componentMap, budgetRange: { min: 4000, max: 10000 } });
  assert.match(html, /Por que estas peças\? Custos, perfil e alternativas/);
  assert.equal((html.match(/class="recommendation-component-reason"/g) || []).length, 7);
});

test('SSR: retained cooling invalidates the old explanation instead of showing its obsolete budget and fit', () => {
  const props = { recommendation, currentComponents: { cooler: { id: 'test-current-cooler', price: 100 } } };
  const html = render('RecommendationCard', props);
  assert.match(html, /justificativas de custo e compatibilidade precisam ser recalculadas/);
  assert.doesNotMatch(html, /class="recommendation-component-reason"/);
  const componentMap = Object.fromEntries(Object.values(recommendation.components).map(component => [component.id, component]));
  const range = render('RecommendationResultCard', { recommendation, componentMap, currentSelection: props.currentComponents });
  assert.match(range, /precisam ser recalculadas/);
  assert.doesNotMatch(range, /class="recommendation-component-reason"/);
});

test('SSR: selected-build explanation and alternative comparison distinguish user choice from approval', () => {
  const summary = generateBuildSummary({ build: currentBuild, budget: { amount: 10000 }, usageType: 'programming' });
  const html = render('RecommendationExplanation', { explanation: summary.selectionExplanation });
  assert.match(html, /Entender as peças da minha montagem/);
  assert.match(html, /escolhidas por você/);
  assert.match(html, /não são uma aprovação automática/);
  const alternative = render('RecommendationCard', { recommendation: summary.recommendationObservation });
  assert.match(alternative, /Impacto em relação à montagem atual/);
  assert.match(alternative, /Variação do custo total/);
  assert.match(alternative, /não percentuais de desempenho nem FPS/);
});

test('SSR: partial responses and absent explanations have honest recovery text without fake zero totals', () => {
  const explanation = globalThis.structuredClone(recommendation.selectionExplanation);
  explanation.budget = { total: null, knownReferenceSubtotal: 800, coolingSubtotal: null, limit: 1000, remaining: null };
  const html = render('RecommendationExplanation', { explanation });
  assert.match(html, /Total incompleto. Subtotal conhecido/);
  assert.match(html, /Há preço de refrigeração pendente/);
  assert.match(html, /Saldo não verificável/);
  assert.doesNotMatch(html, /Saldo estimado/);
  assert.match(render('RecommendationExplanation', {}), /Justificativas por peça indisponíveis/);
});
