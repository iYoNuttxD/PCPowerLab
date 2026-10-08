import { referenceFixtureTotal } from '../../tests/helpers/reference-price-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build as bundle } from 'esbuild';
import { selectBuildComponents, calculateBuildPrice as backendTotal } from '../../src/services/build.service.js';
import { calculateBuildPrice } from '../src/utils/buildHelpers.js';

const selected = selectBuildComponents({
  cpuId: 'cpu-ryzen-5-5500', gpuId: 'gpu-rtx-3050', motherboardId: 'mb-b550m-aorus-elite',
  ramId: 'ram-kingston-fury-16gb-ddr4', storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w', caseId: 'case-mid-tower-airflow'
});

const expected = referenceFixtureTotal({ cpu: 'cpu-ryzen-5-5500', gpu: 'gpu-rtx-3050' });

test('frontend totals preserve centavos and match the backend for real catalogue prices', () => {
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
