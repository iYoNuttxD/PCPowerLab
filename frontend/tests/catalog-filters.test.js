import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogFilterFields, emptyCatalogFilters, filterComponents, priceRangeError, performanceRangeError, catalogPerformanceScore, componentValueScore } from '../src/utils/componentPresentation.js';

const products = [
  { id: 'c', category: 'cpu', brand: 'Marca', name: 'Ágil', partNumber: 'SKU-456', price: 1000, performanceScore: 80, specs: { socket: 'AM5', cores: 8 } },
  { id: 'b', category: 'cpu', brand: 'Marca', name: 'Beta', price: 500, performanceScore: 60, specs: { socket: 'AM4', cores: 6 } },
  { id: 'a', category: 'cpu', brand: 'Outro', name: 'Ausente', price: null, performanceScore: null, specs: {} },
  { id: 'g', category: 'gpu', brand: 'Marca', name: 'GPU', price: 100, performanceScore: 99, specs: { vramGb: 12 } }
];
const ids = (filters, data = products, compat = {}) => filterComponents(data, { ...emptyCatalogFilters, ...filters }, compat).map(c => c.id);

test('search normalizes accents and includes exact part number while composing category brand and price', () => {
  assert.deepEqual(ids({ search: 'agil' }), ['c']);
  assert.deepEqual(ids({ search: 'sku-456' }), ['c']);
  assert.deepEqual(ids({ category: 'cpu', brand: 'Marca', minPrice: 500, maxPrice: 1000 }), ['c', 'b']);
  assert.deepEqual(ids({ minPrice: 0 }), ['c', 'b', 'g']);
});
test('price/performance ranges reject invalid or inverted input, include boundaries and exclude unknown', () => {
  for (const minPrice of [-1, 'no', Infinity]) assert.ok(priceRangeError({ minPrice }));
  assert.ok(priceRangeError({ minPrice: 2, maxPrice: 1 }));
  for (const minPerformance of [-1, 101, 'no', Infinity]) assert.ok(performanceRangeError({ minPerformance }));
  assert.ok(performanceRangeError({ minPerformance: 80, maxPerformance: 60 }));
  assert.deepEqual(ids({ category: 'cpu', minPerformance: 60, maxPerformance: 80 }), ['c', 'b']);
  assert.deepEqual(ids({ category: 'cpu', minPerformance: 81 }), []);
  assert.deepEqual(ids({ minPrice: -1 }), []);
});
test('every dynamic spec field supports exact selection and missing values fail closed', () => {
  for (const [category, fields] of Object.entries(catalogFilterFields)) {
    for (const key of fields) {
      const a = { id: 'match', name: 'match', category, specs: { [key]: 12 } };
      const b = { id: 'missing', name: 'missing', category, specs: {} };
      assert.deepEqual(ids({ category, specs: { [key]: '12' } }, [a, b]), ['match']);
      assert.deepEqual(ids({ category, specs: { [key]: '1' } }, [a, b]), []);
    }
  }
  assert.deepEqual(ids({ category: 'cooler', specs: { supportedSockets: 'AM5' } }, [{ id: 'x', category: 'cooler', specs: { supportedSockets: ['AM4', 'AM5'] } }]), ['x']);
  assert.deepEqual(ids({ category: 'gpu', specs: { socket: 'AM5' } }), ['g']);
});
test('sorting is deterministic, non-mutating, and always places missing numeric fields last', () => {
  const original = products.map(p => p.id);
  assert.deepEqual(ids({ category: 'cpu', sort: 'price-asc' }), ['b', 'c', 'a']);
  assert.deepEqual(ids({ category: 'cpu', sort: 'price-desc' }), ['c', 'b', 'a']);
  assert.deepEqual(ids({ category: 'cpu', sort: 'performance-asc' }), ['b', 'c', 'a']);
  assert.deepEqual(ids({ category: 'cpu', sort: 'performance-desc' }), ['c', 'b', 'a']);
  assert.deepEqual(ids({ category: 'cpu', sort: 'value-desc' }), ['b', 'c', 'a']);
  assert.deepEqual(ids({ category: 'cpu', sort: 'value-asc' }), ['c', 'b', 'a']);
  assert.deepEqual(ids({ sort: 'performance-desc' }), ids({ sort: 'name-asc' }));
  assert.deepEqual(ids({ sort: 'value-desc' }), ids({ sort: 'name-asc' }));
  assert.deepEqual(products.map(p => p.id), original);
});
test('scores never fabricate unsupported category or missing price values', () => {
  assert.equal(catalogPerformanceScore({ category: 'fan', performanceScore: 99 }), null);
  assert.equal(catalogPerformanceScore({ category: 'cpu', performanceScore: '99' }), null);
  assert.equal(componentValueScore(products[0]), 80);
  for (const price of [null, 0, -1, Infinity, '100']) assert.equal(componentValueScore({ ...products[0], price }), null);
});
test('compatibility uses backend statuses and never turns absent results into compatible', () => {
  const map = { c: { status: 'compatible' }, b: 'incompatible', g: { status: 'unverified' } };
  assert.deepEqual(ids({ compatibility: 'compatible' }, products, map), ['c']);
  assert.deepEqual(ids({ compatibility: 'incompatible' }, products, map), ['b']);
  assert.deepEqual(ids({ compatibility: 'unverified' }, products, map), ['g']);
  assert.deepEqual(ids({ compatibility: 'compatible' }), []);
});

test('actual catalog satisfies the AMD AM4 ceiling example and preserves distinct variants', async () => {
  const { listComponents } = await import('../../src/services/component.service.js');
  const actual = listComponents();
  const matches = filterComponents(actual, { ...emptyCatalogFilters, category: 'cpu', brand: 'AMD', maxPrice: '1000', specs: { socket: 'AM4' }, sort: 'price-asc' });
  assert.deepEqual(matches.map(component => component.id), ['cpu-ryzen-5-5600', 'cpu-ryzen-5-5500']);
  const ddr5 = filterComponents(actual, { ...emptyCatalogFilters, category: 'ram', specs: { memoryType: 'DDR5', capacityGb: '32', speedMhz: '6000' } });
  assert.ok(ddr5.length > 1);
  assert.equal(new Set(ddr5.map(component => component.id)).size, ddr5.length);
  const air = filterComponents(actual, { ...emptyCatalogFilters, category: 'cooler', specs: { coolingType: 'air', supportedSockets: 'AM4' } });
  assert.ok(air.length > 0);
  assert.ok(air.every(component => component.specs.coolingType === 'air' && component.specs.supportedSockets.includes('AM4')));
});
