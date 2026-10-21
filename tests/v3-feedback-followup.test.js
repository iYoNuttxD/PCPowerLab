import test from 'node:test';
import assert from 'node:assert/strict';
import { listComponents } from '../src/services/component.service.js';
import { recommendBuildByBudget } from '../src/services/recommendationService.js';
import { filterComponents } from '../frontend/src/utils/componentPresentation.js';
import { feedbackCatalog } from '../src/data/catalog.feedback.js';
import { getDatedReference } from '../src/data/dated-price-references.js';

test('Wi-Fi aliases and independent resource tokens find actual boards, including AX names', () => {
  const catalog = listComponents();
  for (const search of ['Wi-Fi', 'wifi', 'sem fio']) {
    const found = filterComponents(catalog, { category: 'motherboard', search });
    assert.equal(found.length, 3);
    assert.ok(found.some(c => c.id === 'mb-gigabyte-b650-gaming-x-ax-v2'));
    assert.ok(found.every(c => c.verifiedFeatures.fields.wifi));
  }
  assert.deepEqual(filterComponents(catalog, { category: 'motherboard', search: 'DDR5 Wi-Fi B650' }).map(c => c.id), ['mb-gigabyte-b650-gaming-x-ax-v2']);
  assert.ok(filterComponents(catalog, { category: 'motherboard', specs: { wifi: 'false' } }).every(c => c.verifiedFeatures.fields.wifi === false));
  assert.equal(filterComponents(catalog, { category: 'motherboard', specs: { m2Slots: '3' } }).length, 1);
});

test('programming recommendation uses 16 GB within BRL 6000, and explicit memory requirements are enforced', () => {
  const input = { budget: { amount: 6000 }, usageType: 'programming' };
  const suggestion = recommendBuildByBudget(input);
  assert.ok(suggestion.components.ram.specs.capacityGb >= 16);
  assert.ok(suggestion.totalEstimatedPrice <= 6000);
  assert.equal(suggestion.compatibilityStatus, 'compatible');
  assert.equal(suggestion.memoryRequirement.minimumGb, 16);
  const custom = recommendBuildByBudget({ ...input, budget: { amount: 15000 }, requirements: { minMemoryGb: 32 } });
  assert.ok(custom.components.ram.specs.capacityGb >= 32);
  assert.equal(custom.memoryRequirement.minimumGb, 32);
  assert.throws(() => recommendBuildByBudget({ ...input, requirements: { minMemoryGb: 0 } }), error => error.statusCode === 400);
});

test('score-only GPU limitations are exposed before applying a complete budget suggestion', () => {
  const result = recommendBuildByBudget({ budget: { amount: 4500 }, usageType: 'study' });
  assert.equal(result.simulationAvailability.available, true);
  assert.equal(result.simulationAvailability.componentsWithoutPerformanceModel, undefined);
});

test('five targeted choices retain dated exact offers and unknown technical/performance facts', () => {
  assert.equal(feedbackCatalog.length, 5);
  const actual = listComponents();
  for (const record of feedbackCatalog) {
    const component = actual.find(c => c.id === record.id);
    assert.ok(component.price > 0);
    assert.equal(getDatedReference(component).availability, 'available');
    assert.equal(getDatedReference(component).model, component.partNumber);
    if (['cpu', 'gpu'].includes(component.category)) assert.ok(Number.isFinite(component.performanceScore));
  }
  const budgetGpu = actual.find(c => c.id === 'gpu-pcyes-rx-550-edge-4gb');
  assert.equal(budgetGpu.price, 619.9);
  assert.equal(budgetGpu.specs.lengthMm, null);
  const cases = actual.filter(c => c.category === 'case');
  assert.equal(cases.length, 6);
  assert.equal(cases.find(c => c.id === 'case-montech-x2-plus-white').specs.maxGpuLengthMm, 305);
  assert.equal(cases.find(c => c.id === 'case-montech-xr-white').specs.maxGpuLengthMm, 420);
});

test('explicit pending-cooling proposals retain accessories, budget and uncertainty without certifying fit', () => {
  const input = { budget: { amount: 6000 }, usageType: 'programming', components: { coolerId: 'cooler-bequiet-pure-rock-3-black' } };
  assert.equal(recommendBuildByBudget(input).components.cooler.id, input.components.coolerId);
  const proposal = recommendBuildByBudget({ ...input, allowPendingCooling: true });
  assert.equal(proposal.components.cooler.id, input.components.coolerId);
  assert.ok(proposal.totalEstimatedPrice <= 6000);
  assert.ok(proposal.components.ram.specs.capacityGb >= 16);
  assert.equal(proposal.compatibilityStatus, 'unverified');
  assert.equal(proposal.coolingAssessment.status, 'unverified');
  assert.ok(proposal.unverifiedChecks.some(check => check.code === 'AIR_COOLER_CLEARANCE_UNVERIFIED'));
  assert.throws(() => recommendBuildByBudget({ ...input, allowPendingCooling: 'yes' }), error => error.statusCode === 400);
});
