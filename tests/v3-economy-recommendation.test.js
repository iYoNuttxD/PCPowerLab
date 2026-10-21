import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendBuildByBudget, recommendBuildsByBudgetRange } from '../src/services/recommendationService.js';
import { listComponents } from '../src/services/component.service.js';
import { evaluateResolvedBuildCompatibility } from '../src/services/compatibility.service.js';
import { getDatedReference } from '../src/data/dated-price-references.js';

const factual = (amount, extra = {}) => recommendBuildByBudget({ budget: { amount }, usageType: 'study', selectionMode: 'price-and-compatibility', ...extra });
const core = () => factual(4500).components;

for (const amount of [3000, 4000]) test(`BRL ${amount} reports verified minimum, gap and specific cheaper-path blockers without approving it`, () => {
  const before = listComponents().map(c => [c.id, c.price, c.performanceScore]);
  assert.throws(() => factual(amount), error => {
    assert.equal(error.statusCode, 422);
    assert.match(error.message, /4\.339,84/);
    assert.equal(error.budgetFeasibility.minimumCatalogRulesTotal, 4339.84);
    assert.equal(error.budgetFeasibility.lowerBound, 3235.05);
    assert.equal(error.budgetFeasibility.pendingTotal, 3289.75);
    assert.deepEqual(error.budgetFeasibility.pendingChecks.map(check => check.code).sort(), ['CASE_GPU_LENGTH_UNVERIFIED', 'CPU_BIOS_UNVERIFIED', 'GPU_POWER_CONNECTORS_UNVERIFIED']);
    assert.ok(error.errors.some(message => message.includes('não aprovado')));
    return true;
  });
  assert.deepEqual(listComponents().map(c => [c.id, c.price, c.performanceScore]), before);
});

test('entry factual selection has verified core, exact price, capacity floor and no aggregate performance claim', () => {
  const result = factual(4500);
  assert.equal(result.totalEstimatedPrice, 4339.84);
  assert.equal(result.compatibilityStatus, 'unverified');
  assert.equal(result.coreCatalogRulesStatus, 'compatible');
  assert.ok(result.unverifiedChecks.some(check => check.code === 'CPU_BIOS_UNVERIFIED'));
  assert.equal(result.performanceScore, null);
  assert.equal(result.performanceBasis, 'not_used');
  assert.equal(result.memoryRequirement.minimumGb, 8);
  assert.equal(result.biosSupport.minimumVersion, '2423');
  assert.equal(result.biosSupport.installedVersion, null);
  assert.equal(result.coolingAssessment.status, 'unverified');
  assert.equal(result.simulationAvailability.available, false);
  assert.equal(result.selectionExplanation.scope, 'all_active_catalog_price_and_compatibility');
  for (const reason of result.selectionExplanation.componentReasons) {
    assert.equal(reason.performance.score, null);
    assert.equal(reason.profile.weight, null);
    assert.ok(!reason.excludedAlternatives);
  }
});

test('intermediate factual proposal admits exact uncalibrated RX7600, meets 16GB RAM/8GB VRAM and verifies 303mm fit', () => {
  const result = factual(5500, { usageType: 'programming', requirements: { minVramGb: 8 } });
  assert.equal(result.components.gpu.id, 'gpu-asrock-rx-7600-challenger-pro-8gb');
  assert.equal(result.components.case.id, 'case-montech-x2-plus-white');
  assert.equal(result.totalEstimatedPrice, 5009.84);
  assert.equal(result.compatibilityStatus, 'unverified');
  assert.equal(result.coreCatalogRulesStatus, 'compatible');
  assert.ok(result.unverifiedChecks.some(check => check.code === 'CPU_BIOS_UNVERIFIED'));
  assert.ok(result.components.ram.specs.capacityGb >= 16);
  assert.ok(result.components.gpu.specs.vramGb >= 8);
  assert.equal(result.components.gpu.performanceModelStatus, 'unavailable');
  assert.equal(result.performanceScore, null);
  assert.equal(result.simulationAvailability.available, false);
  assert.ok(getDatedReference(result.components.gpu));
});

test('factual price ordering cannot override capacity, conflict or missing-data checks', () => {
  const result = factual(8000, { requirements: { minMemoryGb: 32, minVramGb: 8 } });
  assert.ok(result.components.ram.specs.capacityGb >= 32);
  assert.ok(result.components.gpu.specs.vramGb >= 8);
  assert.notEqual(result.components.cpu.id, 'cpu-ryzen-5-4500-box');
  assert.notEqual(result.components.gpu.id, 'gpu-pcyes-rx-550-edge-4gb');
  assert.notEqual(result.components.gpu.id, 'gpu-asrock-arc-a380-challenger-itx-6g-oc');
  const pending = factual(6000, { usageType: 'programming', components: { coolerId: 'cooler-bequiet-pure-rock-3-black' }, allowPendingCooling: true });
  assert.equal(pending.components.cooler.id, 'cooler-bequiet-pure-rock-3-black');
  assert.equal(pending.compatibilityStatus, 'unverified');
  assert.equal(pending.coolingAssessment.status, 'unverified');
});

test('Ryzen4500 BIOS minimum is factual while installed BIOS remains unknown, older fails and exact minimum passes', () => {
  const build = structuredClone(core());
  build.cpu = listComponents({ type: 'cpu' }).find(c => c.id === 'cpu-ryzen-5-4500-box');
  let result = evaluateResolvedBuildCompatibility(build);
  assert.equal(result.compatible, false);
  assert.ok(result.unverifiedChecks.some(check => check.code === 'CPU_BIOS_UNVERIFIED' && check.message.includes('2423')));
  build.motherboard.specs.installedBiosVersion = '2422';
  result = evaluateResolvedBuildCompatibility(build);
  assert.ok(result.alerts.some(check => check.code === 'CPU_BIOS_BELOW_MINIMUM'));
  build.motherboard.specs.installedBiosVersion = '2423';
  assert.equal(evaluateResolvedBuildCompatibility(build).compatible, true);
});

test('RX550 manufacturer power recommendation resolves only PSU wattage, without guessing length or auxiliary power', () => {
  const build = structuredClone(core());
  build.gpu = listComponents({ type: 'gpu' }).find(c => c.id === 'gpu-pcyes-rx-550-edge-4gb');
  assert.equal(build.gpu.specs.recommendedPsuWatts, 400);
  assert.equal(build.gpu.specs.typicalBoardPowerWatts, 50);
  assert.equal(build.gpu.specs.tdpWatts, null);
  assert.ok(getDatedReference(build.gpu));
  const result = evaluateResolvedBuildCompatibility(build);
  assert.equal(result.compatible, false);
  assert.ok(!result.unverifiedChecks.some(c => c.code === 'PSU_POWER_UNVERIFIED'));
  assert.ok(result.unverifiedChecks.some(c => c.code === 'GPU_POWER_CONNECTORS_UNVERIFIED'));
  assert.ok(result.unverifiedChecks.some(c => c.code === 'CASE_GPU_LENGTH_UNVERIFIED'));
});

test('invalid factual criteria fail explicitly and ranked selection remains the default', () => {
  assert.throws(() => factual(4500, { selectionMode: 'unknown' }), e => e.statusCode === 400);
  assert.throws(() => factual(4500, { requirements: { minVramGb: 5 } }), e => e.statusCode === 400);
  assert.throws(() => recommendBuildsByBudgetRange({ budgetRange: { min: 4000, max: 6000 }, selectionMode: 'price-and-compatibility' }), e => e.statusCode === 400);
  const ranked = recommendBuildByBudget({ budget: { amount: 6000 }, usageType: 'programming' });
  assert.ok(Number.isFinite(ranked.performanceScore));
  assert.notEqual(ranked.components.gpu.id, 'gpu-asrock-rx-7600-challenger-pro-8gb');
});
