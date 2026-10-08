import test from 'node:test';
import assert from 'node:assert/strict';
import { datedReference, referenceCoverage, referenceLabel } from '../src/utils/referencePricing.js';
const component = { id: 'a', price: 20, pricing: { price: 20, updateStatus: 'dated_snapshot', source: 'dated_public_reference', isMarketQuote: false, queriedAt: '2026-10-08' } };
test('dated badge refuses saved old price paired with new pricing metadata', () => {
  assert.ok(datedReference(component));
  assert.equal(datedReference({ ...component, price: 10 }), null);
  assert.equal(datedReference({ ...component, pricing: { ...component.pricing, isMarketQuote: true } }), null);
  assert.match(referenceLabel({ id: 'old', price: 10 }), /sem fonte datada/);
});
test('coverage separates dated and demonstrative pack counts', () => {
  assert.deepEqual(referenceCoverage({ cpu: component, gpu: { id: 'b', price: 100 }, fans: [{ ...component, quantity: 3 }] }), { dated: 4, estimated: 1, total: 5 });
  assert.deepEqual(referenceCoverage(), { dated: 0, estimated: 0, total: 0 });
});
