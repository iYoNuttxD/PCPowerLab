import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build as bundle } from 'esbuild';
import { selectBuildComponents, calculateBuildPrice as backendTotal } from '../../src/services/build.service.js';
import { calculateBuildPrice } from '../src/utils/buildHelpers.js';

// Frozen rendered retailer observations, copied from all-new-offers-for-integration.json.
// Keep expected amounts independent of application pricing and aggregation code.
const facts = JSON.parse(readFileSync(new URL('./fixtures/market-build-price-facts.json', import.meta.url), 'utf8'));
const selection = Object.fromEntries(Object.entries(facts).map(([slot, fact]) => [`${slot}Id`, fact.productId]));
const selected = selectBuildComponents(selection);
const expected = 7279.75;

test('frontend totals preserve centavos and match the backend for real catalogue prices', () => {
  for (const [slot, fact] of Object.entries(facts)) {
    assert.equal(selected[slot].id, fact.productId);
    assert.equal(selected[slot].price, fact.price);
    assert.equal(selected[slot].catalogStatus, 'active');
  }
  assert.equal(backendTotal(selected), expected);
  assert.equal(calculateBuildPrice(selected), expected);
  const withPacks = { ...selected, cooler: { price: 129.9 }, fans: [{ price: 39.9, quantity: 3 }] };
  assert.equal(calculateBuildPrice(withPacks), Number((expected + 129.9 + 39.9 * 3).toFixed(2)));
  assert.equal(calculateBuildPrice(withPacks), backendTotal(withPacks));
});

test('an exact-centavo budget renders within budget and one cent less renders over', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-budget-total-'));
  try {
    const output = join(temporary, 'budget-panel.mjs');
    await bundle({
      stdin: { resolveDir: resolve(dirname(fileURLToPath(import.meta.url)), '..'), loader: 'jsx', contents: `
        export { default as React } from 'react';
        export { renderToStaticMarkup } from 'react-dom/server';
        export { default as BudgetPanel } from './src/components/build/BudgetPanel.jsx';
      ` },
      bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
      banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" }
    });
    const { React, renderToStaticMarkup, BudgetPanel } = await import(pathToFileURL(output).href);
    const render = amount => renderToStaticMarkup(React.createElement(BudgetPanel, {
      totalPrice: calculateBuildPrice(selected), budget: { amount }
    }));
    assert.match(render(expected), />Dentro</);
    assert.doesNotMatch(render(expected), />Acima</);
    assert.match(render(Number((expected - 0.01).toFixed(2))), />Acima</);
    assert.match(render(Number((expected - 0.01).toFixed(2))), /0,01/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('unavailable original selections retain identity and cannot contribute their old prices to a total', () => {
  const legacy = selectBuildComponents({ ...selection, gpuId: 'gpu-rtx-3050', ramId: 'ram-kingston-fury-16gb-ddr4' });
  assert.equal(legacy.gpu.id, 'gpu-rtx-3050');
  assert.equal(legacy.ram.id, 'ram-kingston-fury-16gb-ddr4');
  assert.equal(legacy.gpu.price, null);
  assert.equal(legacy.ram.price, null);
  assert.equal(calculateBuildPrice({ ...selected, gpu: legacy.gpu }), null);
  assert.throws(() => backendTotal({ ...selected, gpu: legacy.gpu }), /Total indisponivel/);
});
