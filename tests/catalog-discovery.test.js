import test from 'node:test';
import assert from 'node:assert/strict';
import { listComponents, withCatalogPerformance } from '../src/services/component.service.js';
import { findPerformanceParameterRecordByComponentId } from '../src/data/performance-parameter.repository.js';
import { previewCatalogCompatibility } from '../src/services/catalogCompatibilityService.js';
import { checkBuildCompatibility } from '../src/services/compatibility.service.js';
import { componentRoutes } from '../src/routes/component.routes.js';
import { getCatalogCompatibility } from '../src/controllers/component.controller.js';

const selection = { cpu: 'cpu-ryzen-5-5600', motherboard: 'mb-asus-prime-b550m-a', gpu: 'gpu-rtx-4060', ram: 'ram-corsair-vengeance-16gb-ddr4-3200', storage: 'ssd-kingston-nv2-1tb', psu: 'psu-corsair-cv650', case: 'case-cooler-master-masterbox-q300l' };
// Resolve fixture IDs from catalog instead of coupling to a particular display name.
for (const [slot, id] of Object.entries(selection)) {
  if (!listComponents({ category: slot }).some(c => c.id === id)) selection[slot] = listComponents({ category: slot })[0].id;
}

test('catalog exposes only recorded meaningful scores with explicit internal methodology', () => {
  for (const component of listComponents()) {
    if (['cpu', 'gpu', 'ram', 'storage'].includes(component.category)) {
      assert.equal(component.performanceScore, findPerformanceParameterRecordByComponentId(component.id)?.performanceScore ?? null);
      if (component.performanceScore !== null) assert.match(component.performanceMethodology, /mesma categoria/);
    } else {
      assert.equal(component.performanceScore, null);
      assert.equal(component.performanceMethodology, null);
    }
  }
  assert.equal(withCatalogPerformance({ id: 'unknown', category: 'cpu' }).performanceScore, null);
});
test('candidate endpoint is registered and controller returns envelope', () => {
  assert.ok(componentRoutes.stack.some(l => l.route?.path === '/compatibility' && l.route.methods.post));
  let envelope;
  const res = { status() { return this; }, json(value) { envelope = value; return value; } };
  getCatalogCompatibility({ body: { components: {}, category: 'cpu' } }, res, error => { throw error; });
  assert.ok(envelope.data.length);
  assert.ok(envelope.data.every(c => c.status === 'unverified'));
});
test('complete candidate previews are exactly equivalent to existing full compatibility checks', () => {
  for (const candidate of previewCatalogCompatibility(selection)) {
    const component = listComponents().find(c => c.id === candidate.componentId);
    const input = component.category === 'fan' ? { ...selection, fans: [{ fanId: component.id, quantity: 1 }] } : { ...selection, [component.category]: component.id };
    const actual = checkBuildCompatibility(input);
    assert.equal(candidate.status, actual.status, component.id);
    assert.deepEqual(candidate.alerts, actual.alerts, component.id);
    assert.deepEqual(candidate.unverifiedChecks, actual.unverifiedChecks, component.id);
  }
});
test('partial build finds real socket conflicts but never claims complete verification', () => {
  const board = listComponents({ category: 'motherboard' }).find(c => c.specs.socket === 'AM4');
  const result = previewCatalogCompatibility({ motherboard: board.id }, 'cpu');
  assert.ok(result.some(c => c.status === 'incompatible'));
  assert.ok(result.some(c => c.status === 'unverified'));
  assert.ok(!result.some(c => c.status === 'compatible'));
});
test('fan previews preserve existing pack quantity and reuse cooling clearances', () => {
  const fan = listComponents({ category: 'fan' })[0];
  const input = { ...selection, fans: [{ fanId: fan.id, quantity: 2 }] };
  const result = previewCatalogCompatibility(input, 'fan').find(c => c.componentId === fan.id);
  const actual = checkBuildCompatibility(input);
  assert.equal(result.status, actual.status);
  assert.deepEqual(result.alerts, actual.alerts);
  assert.deepEqual(result.unverifiedChecks, actual.unverifiedChecks);
});
test('invalid selection and category are rejected without silently dropping chosen components', () => {
  for (const selection of [null, [], 'bad', { cpu: 'unknown' }, { cpu: 2 }, { cpu: listComponents({ category: 'gpu' })[0].id }, { fans: [{ fanId: 'unknown', quantity: 1 }] }]) {
    assert.throws(() => previewCatalogCompatibility(selection), error => [400, 404].includes(error.statusCode));
  }
  assert.throws(() => previewCatalogCompatibility({}, 'unknown'), error => error.statusCode === 400);
});
