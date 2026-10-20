import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { emptyCatalogFilters } from '../src/utils/componentPresentation.js';
import { formatVerifiedFeature } from '../src/utils/verifiedFeaturesPresentation.js';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let directory, ui;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'pcpowerlab-journey-v3-'));
  const output = join(directory, 'ui.mjs');
  await build({
    stdin: { resolveDir: frontend, loader: 'jsx', contents: `
      export { createElement } from 'react';
      export { renderToStaticMarkup } from 'react-dom/server';
      export { ComponentsProvider } from './src/hooks/useComponents.js';
      export { default as WizardNavigation } from './src/components/build/WizardNavigation.jsx';
      export { default as ComponentFilters } from './src/components/componentsCatalog/ComponentFilters.jsx';
      export { default as ComponentCard, PerformanceModelNotice } from './src/components/componentsCatalog/ComponentCard.jsx';
      export { default as ComponentComparison } from './src/components/componentsCatalog/ComponentComparison.jsx';
    ` },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" }
  });
  ui = await import(pathToFileURL(output).href);
});
after(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });
function render(Component, props) { return ui.renderToStaticMarkup(ui.createElement(ui.ComponentsProvider, null, ui.createElement(Component, props))); }
const navigation = extra => render(ui.WizardNavigation, { currentStep: 'budget', completedSteps: [], canAdvance: false, guidance: 'Defina o orçamento.', budget: { amount: '' }, selectedComponents: { fans: [] }, totalPrice: 0, ...extra });

test('first-step navigation shows an undefined budget and pending remainder, not a zero spending limit', () => {
  const html = navigation();
  assert.match(html, /<dt>Limite<\/dt><dd>Não definido<\/dd>/);
  assert.match(html, /<dt>Restante<\/dt><dd>Pendente<\/dd>/);
  assert.match(html, /Etapa 1 de 9/);
  assert.match(html, /Próximo: Processador/);
  assert.match(html, /disabled=""[^>]*aria-describedby="wizard-guidance"[^>]*>Avançar/);
});

test('sticky budget progress distinguishes remaining, exceeded and genuinely unknown prices', () => {
  const within = navigation({ budget: { amount: 5000 }, totalPrice: 1300 });
  assert.match(within, /<dt>Acumulado<\/dt><dd>R\$ 1\.300,00<\/dd>/);
  assert.match(within, /<dt>Restante<\/dt><dd>R\$ 3\.700,00<\/dd>/);
  const over = navigation({ currentStep: 'cpu', budget: { amount: 1000 }, totalPrice: 1300 });
  assert.match(over, /<dt>Acima do limite<\/dt><dd>R\$ 300,00<\/dd>/);
  assert.match(over, />Editar orçamento<\/button>/);
  const pending = navigation({ budget: { amount: 5000 }, totalPrice: null,
    selectedComponents: { cpu: { id: 'cpu', price: 1000 }, gpu: { id: 'gpu', price: null }, fans: [] } });
  assert.match(pending, /<dt>Subtotal conhecido<\/dt><dd>R\$ 1\.000,00<\/dd>/);
  assert.match(pending, /<dt>Restante<\/dt><dd>Pendente<\/dd>/);
  assert.match(pending, /Preço pendente em 1 peça/);
  assert.doesNotMatch(pending, /4\.000,00/);
});

test('editing a budget can resume review while the selected-step identity stays honest', () => {
  const html = navigation({ canAdvance: true, budget: { amount: 5000 }, nextStep: 'review' });
  assert.match(html, /Etapa 1 de 9 · Orçamento/);
  assert.match(html, /Próximo: Revisão/);
  assert.doesNotMatch(html, /Próximo: Processador/);
});

test('all applied filter categories are named and removable outside the collapsed advanced disclosure', () => {
  const filters = { ...emptyCatalogFilters, search: 'Ryzen', category: 'cpu', brand: 'AMD', minPrice: '100', maxPrice: '900', specs: { socket: 'AM4' } };
  const html = render(ui.ComponentFilters, { components: [], filters, onChange() {} });
  assert.match(html, /6 filtros ativos/);
  const active = html.slice(html.indexOf('class="active-filters"'));
  for (const text of ['Busca: Ryzen', 'Categoria: Processador', 'AMD', 'Encaixe (socket): AM4', 'Preço mínimo:', 'Preço máximo:']) {
    assert.ok(active.includes(`aria-label="Remover filtro ${text}`));
  }
  assert.match(html, /<summary>Mais filtros \(2\)<\/summary>/);
  assert.doesNotMatch(html, /catalog-advanced-filters" open/);
  const fixed = render(ui.ComponentFilters, { components: [], filters, fixedCategory: 'cpu', onChange() {} });
  assert.doesNotMatch(fixed, /Remover filtro Categoria/);
  assert.deepEqual(filters.specs, { socket: 'AM4' });
});

test('component list shows two selection essentials while full specifications stay behind an accessible details action', () => {
  const html = render(ui.ComponentCard, { component: { id: 'cpu', category: 'cpu', name: 'CPU teste', brand: 'AMD', price: 500,
    specs: { socket: 'AM4', cores: 6, threads: 12, boostClockGhz: 4.4 }, performanceScore: 65 }, onSelect() {} });
  assert.match(html, /Encaixe \(socket\)/);
  assert.match(html, />Núcleos<\/dt>/);
  assert.doesNotMatch(html, />Threads<\/dt>|4,4 GHz/);
  assert.match(html, /<details class="component-score-disclosure"><summary>Índice de desempenho<\/summary>/);
  assert.match(html, /Pontuação estimada: 65 \/ 100/);
  assert.match(html, /aria-haspopup="dialog" aria-label="Detalhes de CPU teste"/);
});

test('verified feature formatting never confuses absence, zero or unknown evidence', () => {
  for (const value of [null, undefined, '', NaN, -1]) assert.equal(formatVerifiedFeature('m2Slots', value), 'Não confirmado');
  assert.equal(formatVerifiedFeature('wifi', false), 'Não');
  assert.equal(formatVerifiedFeature('flashback', true), 'Sim');
  assert.equal(formatVerifiedFeature('wifi', 'Wi-Fi 6E'), 'Wi-Fi 6E');
  assert.equal(formatVerifiedFeature('m2Slots', 0), '0');
  assert.equal(formatVerifiedFeature('ethernetGbps', 2.5), '2,5 Gbps');
  assert.equal(formatVerifiedFeature('maxMemoryGb', 128), '128 GB');
});

test('motherboard comparison differentiates verified connectivity and preserves unknown fields', () => {
  const board = { id: 'board-one', category: 'motherboard', name: 'Board One', specs: { socket: 'AM5', memoryType: 'DDR5' }, price: 1000,
    verifiedFeatures: { fields: { m2Slots: 2, wifi: false, ethernetGbps: 1, flashback: null } } };
  const other = { ...board, id: 'board-two', name: 'Board Two', verifiedFeatures: { fields: { m2Slots: 3, wifi: 'Wi-Fi 6E', ethernetGbps: 2.5, flashback: true } } };
  const html = render(ui.ComponentComparison, { components: [board, other] });
  assert.match(html, /Slots M.2[\s\S]*?<td>2<\/td><td>3<\/td>/);
  assert.match(html, /Wi-Fi integrado[\s\S]*?<td>Não<\/td><td>Wi-Fi 6E<\/td>/);
  assert.match(html, /Rede cabeada[\s\S]*?<td>1 Gbps<\/td><td>2,5 Gbps<\/td>/);
  assert.match(html, /Atualização de BIOS sem CPU[\s\S]*?<td>Não confirmado<\/td><td>Sim<\/td>/);
});


test('foreign or invalid currencies never appear as BRL or generate a fictitious remainder', () => {
  const foreign = navigation({ budget: { amount: 1000, currency: 'USD' }, totalPrice: 300 });
  assert.match(foreign, /<dt>Limite<\/dt><dd>US\$ 1\.000,00<\/dd>/);
  assert.match(foreign, /<dt>Restante<\/dt><dd>Pendente<\/dd>/);
  assert.match(foreign, /Os preços estão em BRL/);
  assert.doesNotMatch(foreign, /700,00/);
  const malformed = navigation({ budget: { amount: 1000, currency: 'invalid' }, totalPrice: 300 });
  assert.match(malformed, /Moeda inválida/);
  assert.match(malformed, /<dt>Restante<\/dt><dd>Pendente<\/dd>/);
});


test('explicitly unavailable performance is disclosed before selection, with full notes in details', () => {
  const component = { id: 'cpu-new', category: 'cpu', name: 'CPU sem calibração', price: 500, specs: {}, performanceScore: null,
    performanceModelStatus: 'unavailable', performanceModelNotes: 'Sem calibração específica: pontuação, FPS e gargalos indisponíveis.' };
  const html = render(ui.ComponentCard, { component });
  assert.match(html, /Desempenho não estimado/);
  assert.doesNotMatch(html, /Índice de desempenho|0 \/ 100/);
  const notes = render(ui.PerformanceModelNotice, { component });
  assert.match(notes, /Limites do modelo de desempenho/);
  assert.ok(notes.includes(component.performanceModelNotes));
  const legacyUnknown = { ...component, performanceModelStatus: undefined };
  assert.doesNotMatch(render(ui.ComponentCard, { component: legacyUnknown }), /Desempenho não estimado/);
  assert.equal(render(ui.PerformanceModelNotice, { component: legacyUnknown }), '');
});
