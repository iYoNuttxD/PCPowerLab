import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build as bundle } from 'esbuild';

let temporary;
let views;
test.before(async () => {
  temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-summary-resilience-'));
  const output = join(temporary, 'views.mjs');
  await bundle({
    stdin: { resolveDir: resolve(dirname(fileURLToPath(import.meta.url)), '..'), loader: 'jsx', contents: `
      export { default as React } from 'react';
      export { renderToStaticMarkup } from 'react-dom/server';
      export { MemoryRouter } from 'react-router-dom';
      export { ComponentsProvider } from './src/hooks/useComponents.js';
      export { default as CompatibilityStatus } from './src/components/compatibility/CompatibilityStatus.jsx';
      export { default as BottleneckPanel } from './src/components/build/BottleneckPanel.jsx';
      export { default as PurchaseLinksList } from './src/components/build/PurchaseLinksList.jsx';
      export { default as RecommendationCard } from './src/components/recommendations/RecommendationCard.jsx';
      export { default as BudgetPanel } from './src/components/build/BudgetPanel.jsx';
    ` },
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" }
  });
  views = await import(pathToFileURL(output).href);
});
test.after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });
const render = (name, props) => views.renderToStaticMarkup(views.React.createElement(views.MemoryRouter, null,
  views.React.createElement(views.ComponentsProvider, null, views.React.createElement(views[name], props))));

test('summary compatibility distinguishes a failed check from a failed PC', () => {
  const html = render('CompatibilityStatus', { result: {
    available: false, status: 'unavailable', compatible: null, alerts: [], message: 'Falha temporária na verificação.'
  } });
  assert.match(html, /Compatibilidade temporariamente indisponível/);
  assert.match(html, /Isso não confirma incompatibilidade nem falta de peças/);
  assert.doesNotMatch(html, /incompatibilidades encontradas|0 alerta/);
});

test('summary compatibility pending technical data does not imply incomplete selections', () => {
  const html = render('CompatibilityStatus', { result: {
    compatible: false, status: 'unverified', alerts: [],
    unverifiedChecks: [{ code: 'CPU_BIOS_UNVERIFIED', message: 'Confirme a versão da BIOS.' }]
  } });
  assert.match(html, /Verificações pendentes/);
  assert.match(html, /não necessariamente peças na montagem/);
  assert.match(html, /Confirme a versão da BIOS/);
  assert.doesNotMatch(html, /Dados insuficientes/);
});

test('successful wizard HTTP envelope cannot render an unavailable bottleneck model as balanced', () => {
  const html = render('BottleneckPanel', { result: { status: 'success', data: {
    available: false, reason: 'synthetic_model_not_simulation_calibrated',
    message: 'Este modelo não possui calibração para simulação.', hasBottleneck: null, performanceSummary: null
  } } });
  assert.match(html, /Análise de gargalos indisponível/);
  assert.match(html, /Modelo sem calibração para simulação/);
  assert.match(html, /Suas peças e as outras verificações foram mantidas/);
  assert.doesNotMatch(html, /Equilibrado|Não foram identificados gargalos relevantes/);
});

test('store research distinguishes pending, loading, failed and genuinely empty results', () => {
  const pending = render('PurchaseLinksList', { pending: true });
  assert.match(pending, /Links ainda não consultados/);
  assert.doesNotMatch(pending, /Nenhum link de compra disponível/);
  const loading = render('PurchaseLinksList', { loading: true });
  assert.match(loading, /Carregando links das lojas/);
  assert.doesNotMatch(loading, /Nenhum link de compra disponível/);
  const failed = render('PurchaseLinksList', { error: 'Falha ao consultar as lojas.', onRetry: () => {} });
  assert.match(failed, /Falha ao consultar as lojas/);
  assert.match(failed, /Tentar novamente/);
  assert.doesNotMatch(failed, /Nenhum link de compra disponível/);
  assert.match(render('PurchaseLinksList', { linksBySlot: {} }), /Nenhum link de compra disponível/);
});

test('recommendation displays the actual budget, profile and priority without fabricating FPS', () => {
  const html = render('RecommendationCard', { recommendation: {
    components: {}, usageType: 'programming', priority: 'lowest-price',
    requestedBudget: { amount: 6000, currency: 'BRL' }, totalEstimatedPrice: 5500,
    compatibilityStatus: 'compatible', warnings: ['Confirme as condições na loja.']
  } });
  assert.match(html, /Perfil: Programação/);
  assert.match(html, /Prioridade:/);
  assert.match(html, /Limite informado:/);
  assert.match(html, /6\.000,00/);
  assert.match(html, /Confirme as condições na loja/);
  assert.doesNotMatch(html, /\d+ FPS/);
});

test('budget panel never compares another currency against BRL totals', () => {
  const html = render('BudgetPanel', { budget: { amount: 10000, currency: 'USD' }, totalPrice: 6000 });
  assert.match(html, />Pendente</);
  assert.match(html, /não há conversão automática/);
  assert.doesNotMatch(html, />Dentro</);
  assert.match(render('BudgetPanel', { budget: { amount: 6000, currency: 'not a currency' }, totalPrice: 6000 }), /Moeda inválida/);
});
