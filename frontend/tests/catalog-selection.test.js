import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCatalogComponent, isCatalogComponentSelected, formatCatalogScore } from '../src/utils/catalogSelection.js';
import { buildToApiPayload, calculateBuildPrice } from '../src/utils/buildHelpers.js';

function actionsFor(selection) {
  return { selectComponent(type, component) { selection[type] = component; }, setFans(fans) { selection.fans = fans; } };
}

test('catalog selects a category using shared actions and preserves every unrelated selection', () => {
  const selection = { cpu: { id: 'old', price: 100 }, gpu: { id: 'gpu', price: 200 }, cooler: { id: 'cooler', price: 50 }, fans: [{ id: 'fan', price: 20, quantity: 2 }] };
  const gpu = selection.gpu, cooler = selection.cooler, fans = selection.fans;
  const cpu = { id: 'new', category: 'cpu', price: 150 };
  assert.equal(selectCatalogComponent(selection, actionsFor(selection), cpu), true);
  assert.equal(selection.cpu, cpu);
  assert.equal(selection.gpu, gpu);
  assert.equal(selection.cooler, cooler);
  assert.equal(selection.fans, fans);
  assert.equal(buildToApiPayload(selection).cpuId, 'new');
  assert.equal(calculateBuildPrice(selection), 440);
});

test('catalog adds exactly one fan pack and repeated selection preserves quantity', () => {
  const existing = { id: 'existing', category: 'fan', quantity: 3, price: 10 };
  const selection = { fans: [existing] };
  const fan = { id: 'pack', category: 'fan', price: 100, specs: { unitsPerPack: 5 } };
  assert.equal(selectCatalogComponent(selection, actionsFor(selection), fan), true);
  assert.equal(selection.fans[0], existing);
  assert.equal(selection.fans[1].quantity, 1);
  selection.fans[1].quantity = 2;
  assert.equal(selectCatalogComponent(selection, actionsFor(selection), fan), false);
  assert.equal(selection.fans[1].quantity, 2);
  assert.deepEqual(buildToApiPayload(selection).fans, [{ fanId: 'existing', quantity: 3 }, { fanId: 'pack', quantity: 2 }]);
  assert.equal(calculateBuildPrice(selection), 230);
});

test('cooler reuses the existing slot and repeated selection calls no actions', () => {
  const cooler = { id: 'air', category: 'cooler', price: 20 };
  const selection = { fans: [] };
  selectCatalogComponent(selection, actionsFor(selection), cooler);
  assert.equal(isCatalogComponentSelected(selection, cooler), true);
  assert.equal(buildToApiPayload(selection).coolerId, 'air');
  assert.equal(selectCatalogComponent(selection, {}, cooler), false);
});

test('missing or invalid scores never masquerade as zero', () => {
  for (const value of [null, undefined, '', NaN, Infinity, '70']) assert.equal(formatCatalogScore(value), 'Não informado');
  assert.equal(formatCatalogScore(0), '0');
});
