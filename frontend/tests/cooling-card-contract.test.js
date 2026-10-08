import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Actual SSR markup verifies the card and selection-only contract. Browser
// interaction, keyboard focus and layout are separately covered in cooling.spec.js.
const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cooler = { id: 'cooler-one', category: 'cooler', name: 'Cooler One', brand: 'Brand One', price: 100, specs: { coolingType: 'air', supportedSockets: ['AM4'], heightMm: 150 } };
const otherCooler = { ...cooler, id: 'cooler-two', name: 'Cooler Two', price: 200 };
const fan = { id: 'fan-pack', category: 'fan', name: 'Fan Three Pack', brand: 'Brand Two', price: 60, specs: { diameterMm: 120, connector: '4-pin PWM', unitsPerPack: 3, powerWatts: 2 } };
const otherFan = { ...fan, id: 'fan-single', name: 'Fan Single', price: 40, specs: { ...fan.specs, diameterMm: 140, unitsPerPack: 1 } };
const byType = { cooler: [cooler, otherCooler], fan: [fan, otherFan] };
let directory, ui, render;

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'pcpowerlab-cooling-cards-test-'));
  const output = join(directory, 'ui.mjs');
  await build({
    stdin: { resolveDir: frontend, loader: 'jsx', contents: `
      export { createElement } from 'react';
      export { renderToStaticMarkup } from 'react-dom/server';
      export { ComponentsProvider } from './src/hooks/useComponents.js';
      export { default as CoolingPanel } from './src/components/build/CoolingPanel.jsx';
      export { default as ComponentCard } from './src/components/componentsCatalog/ComponentCard.jsx';
    ` },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" }
  });
  ui = await import(pathToFileURL(output).href);
  render = (Component, props) => ui.renderToStaticMarkup(ui.createElement(ui.ComponentsProvider, null, ui.createElement(Component, props)));
});

after(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

function fixture(selectedComponents = { fans: [] }, overrides = {}) {
  const calls = [];
  const build = { selectedComponents, coolingConditions: { inletCelsius: 28, coolerSpeedFraction: 0.5, extraFanSpeedFraction: 1, referenceHeatWatts: 90, modelVersion: 'preserve-this-version' },
    actions: Object.fromEntries(['selectComponent', 'removeComponent', 'setFans', 'setCoolingConditions'].map(name => [name, (...args) => calls.push([name, ...args])])) };
  const before = JSON.stringify(build);
  const html = render(ui.CoolingPanel, { build, byType, onChange: () => calls.push(['onChange']), ...overrides });
  assert.equal(JSON.stringify(build), before, 'rendering never mutates the build or model settings');
  assert.deepEqual(calls, [], 'rendering alone never changes selected products or simulation settings');
  return html;
}

function articles(html) {
  return [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0]);
}

function card(html, name) {
  const matches = articles(html).filter(article => article.includes(`<h3 title="${name}">`));
  assert.equal(matches.length, 1, `expected exactly one visual card for ${name}`);
  return matches[0];
}

test('cooling uses image-backed shared product cards and mounted category panels without selects or simulator DOM', () => {
  const html = fixture();
  assert.equal(articles(html).length, 4);
  assert.match(html, /role="tablist" aria-label="Categorias de refrigeração"/);
  assert.match(html, />Cooler do processador<\/button>/);
  assert.match(html, />Ventoinhas extras<\/button>/);
  const panels = [...html.matchAll(/<section\b[^>]*role="tabpanel"[^>]*>/g)].map(match => match[0]);
  assert.equal(panels.length, 2);
  assert.doesNotMatch(panels[0], /hidden=/);
  assert.match(panels[1], /hidden=""/);
  for (const product of [cooler, otherCooler, fan, otherFan]) {
    const productHtml = card(html, product.name);
    assert.match(productHtml, /class="[^"]*component-card/);
    assert.match(productHtml, /class="component-media/);
    assert.match(productHtml, new RegExp(`data-component-id="${product.id}"`));
    assert.match(productHtml, /class="spec-grid"/);
    assert.match(productHtml, /class="component-card-price"/);
    assert.match(productHtml, new RegExp(`aria-label="Detalhes de ${product.name}"`));
  }
  assert.match(card(html, cooler.name), /aria-pressed="false" aria-label="Selecionar: Cooler One"/);
  assert.match(card(html, fan.name), /aria-pressed="false" aria-label="Adicionar: Fan Three Pack"/);
  assert.doesNotMatch(html, /<select\b|cooling-simulation|cooling-temperature-chart|cooling-noise-result|Restaurar cenário|Ar na entrada do cooler|Rotação do cooler|Potência de referência/);
});

test('selected fan cards expose physical units and pack subtotals without charging individual fans', () => {
  const html = fixture({ cooler, fans: [{ ...fan, quantity: 2 }, { ...otherFan, quantity: 3 }] }, { initialSection: 'fans' });
  const first = card(html, fan.name);
  const second = card(html, otherFan.name);
  for (const [product, productHtml, quantity, physical] of [[fan, first, 2, 6], [otherFan, second, 3, 3]]) {
    assert.match(productHtml, /component-card is-selected/);
    assert.match(productHtml, new RegExp(`aria-pressed="true" aria-label="Adicionado: ${product.name}"`));
    assert.match(productHtml, new RegExp(`Pacotes: ${product.name}`));
    assert.match(productHtml, new RegExp(`type="number"[^>]*min="1"[^>]*max="20"[^>]*value="${quantity}"`));
    assert.ok(productHtml.includes(`${quantity} pacote(s) × ${product.specs.unitsPerPack} unidades = ${physical} ventoinhas`));
    assert.match(productHtml, /Subtotal: R\$\s*120,00/);
    assert.match(productHtml, new RegExp(`aria-label="Remover ventoinhas: ${product.name}"`));
  }
  assert.match(card(html, cooler.name), /aria-label="Remover cooler: Cooler One"/);
  assert.match(card(html, cooler.name), /aria-pressed="true" aria-label="Selecionado: Cooler One"/);
  const panels = [...html.matchAll(/<section\b[^>]*role="tabpanel"[^>]*>/g)].map(match => match[0]);
  assert.match(panels[0], /hidden=""/);
  assert.doesNotMatch(panels[1], /hidden=/);
  assert.equal(articles(html).length, 4, 'selected products reuse their existing cards rather than duplicate them');
});

test('saved cooling absent from active options remains visible, selected and explicitly removable', () => {
  const savedCooler = { ...cooler, id: 'saved-cooler', name: 'Saved Cooler', catalogStatus: 'legacy', selectable: false };
  const savedFan = { ...fan, id: 'saved-fan', name: 'Saved Fan', catalogStatus: 'unavailable', price: null, quantity: 2 };
  const html = fixture({ cooler: savedCooler, fans: [savedFan] });
  assert.equal(articles(html).length, 6);
  for (const product of [savedCooler, savedFan]) {
    const selected = card(html, product.name);
    assert.match(selected, /component-card is-selected/);
    assert.match(selected, /Fora do catálogo ativo · seleção preservada/);
    assert.match(selected, /aria-label="Remover (cooler|ventoinhas): Saved/);
  }
  assert.match(card(html, savedFan.name), /Preço indisponível/);
  assert.doesNotMatch(card(html, savedFan.name), /Subtotal: R\$\s*0,00/);
  assert.match(card(html, savedFan.name), /2 pacote\(s\) × 3 unidades = 6 ventoinhas/);
});

test('loading and failed catalogs retain saved selections and retry without silently clearing choices', () => {
  for (const overrides of [{ loading: true }, { error: 'Catálogo indisponível', onRetry() {} }]) {
    const html = fixture({ cooler, fans: [{ ...fan, quantity: 2 }] }, { byType: {}, ...overrides });
    assert.equal(articles(html).length, 2);
    assert.match(card(html, cooler.name), /Seleção atual preservada/);
    assert.match(card(html, fan.name), /Seleção atual preservada/);
    assert.match(card(html, fan.name), /value="2"/);
    if (overrides.error) assert.match(html, /Tentar novamente/);
    else assert.match(html, /Carregando opções de refrigeração/);
  }
});

test('unknown pack sizes never invent a physical count and missing prices never become free', () => {
  for (const unitsPerPack of [undefined, 0, -1, 1.5, '3']) {
    const incomplete = { ...fan, price: null, quantity: 2, specs: { ...fan.specs, unitsPerPack } };
    const selected = card(fixture({ fans: [incomplete] }), fan.name);
    assert.match(selected, /Quantidade física não verificada: faltam unidades por pacote/);
    assert.match(selected, /Subtotal: Preço indisponível/);
    assert.doesNotMatch(selected, /2 pacote\(s\) ×|= \d+ ventoinhas/);
  }
});

test('empty cooling stays optional and shared cards preserve their default selection labels elsewhere', () => {
  const empty = fixture({ fans: [] }, { byType: {} });
  assert.match(empty, /Opcional/);
  assert.match(empty, /Você pode continuar sem escolher agora/);
  assert.match(empty, /Nenhum cooler disponível no catálogo/);
  assert.match(empty, /Nenhuma ventoinha disponível no catálogo/);
  for (const selected of [false, true]) {
    const html = render(ui.ComponentCard, { component: cooler, selected, onSelect() {} });
    assert.match(html, new RegExp(`aria-label="${selected ? 'Selecionado' : 'Selecionar'}: Cooler One"`));
    assert.doesNotMatch(html, /Adicionar|Adicionado/);
  }
});

test('controlled caller category takes precedence for direct sidebar editing', () => {
  for (const activeSection of ['cooler', 'fans']) {
    const html = fixture({ cooler, fans: [{ ...fan, quantity: 2 }] }, { initialSection: activeSection === 'fans' ? 'cooler' : 'fans', activeSection, onSectionChange() {} });
    const panels = [...html.matchAll(/<section\b[^>]*role="tabpanel"[^>]*>/g)].map(match => match[0]);
    assert.equal(panels[0].includes('hidden=""'), activeSection !== 'cooler');
    assert.equal(panels[1].includes('hidden=""'), activeSection !== 'fans');
  }
});
