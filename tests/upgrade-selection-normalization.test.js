import { createAdminComponent } from '../src/services/admin-component.service.js';
import { createPerformanceParameters } from '../src/services/performanceParametersService.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBuildPrice, selectBuildComponents, serializeBuildSelection } from '../src/services/build.service.js';
import { saveBuild } from '../src/services/savedBuildsService.js';
import { suggestUpgrades } from '../src/services/upgradeSuggestionService.js';
import { generateUpgradeRoadmap } from '../src/services/upgradeRoadmapService.js';

const build = { cpu: 'cpu-ryzen-5-5600', motherboard: 'mb-b550m-aorus-elite', gpu: 'gpu-rtx-4060',
  ram: 'ram-kingston-fury-16gb-ddr4', storage: 'ssd-kingston-nv2-1tb', psu: 'psu-corsair-650w', case: 'case-mid-tower-airflow' };
const mixed = { ...build, components: { cpuId: 'cpu-intel-i3-12100f' } };
const suggest = input => suggestUpgrades({ build: input, budget: { amount: 1000 }, usageType: 'gaming' });
const roadmap = input => generateUpgradeRoadmap({ build: input, totalBudget: 1000, maxSteps: 1, usageType: 'gaming' });

test('upgrade suggestions resolve mixed aliases exactly as the central selector', () => {
  assert.equal(selectBuildComponents(mixed).cpu.id, build.cpu);
  const result = suggest(mixed);
  assert.equal(result.currentBuildSummary.totalEstimatedPrice, null);
  for (const suggestion of result.suggestions) {
    assert.equal(suggestion.currentComponent.id, build[suggestion.componentType]);
  }
});

test('roadmap initial compatibility and steps use the same mixed-alias selection', () => {
  // A known synthetic candidate isolates alias/step behavior from market availability.
  createAdminComponent({ id: 'test-normalized-upgrade-storage', name: 'Synthetic NVMe upgrade',
    type: 'storage', price: 500, interface: 'M.2 NVMe', capacityGb: 1000, storageType: 'SSD' });
  createPerformanceParameters({ componentId: 'test-normalized-upgrade-storage', type: 'storage',
    performanceScore: 88, gamingScore: 86, productivityScore: 90, capacity: 1000,
    interface: 'M.2 NVMe', readSpeed: 7000 });
  const result = roadmap(mixed);
  assert.equal(result.currentBuildSummary.totalEstimatedPrice, null);
  assert.equal(result.initialCompatibility.status, 'compatible');
  assert.deepEqual(result.initialCompatibility.alerts, []);
  assert.ok(result.steps.length > 0);
  assert.equal(result.steps[0].buildAfterStep.cpu, build.cpu);
});

test('legacy slot names, flat ID aliases, nested aliases and saved builds retain identical upgrade results', () => {
  const aliases = Object.fromEntries(Object.entries(build).map(([slot, id]) => [`${slot}Id`, id]));
  const expected = suggest(build);
  for (const input of [aliases, { components: aliases }]) {
    assert.deepEqual(suggest(input), expected);
  }
  const saved = saveBuild({ name: 'Upgrade normalization fixture', components: aliases });
  assert.deepEqual(suggestUpgrades({ buildId: saved.id, budget: { amount: 1000 }, usageType: 'gaming' }), expected);
  assert.deepEqual(roadmap({ components: aliases }), roadmap(saved.components));
});

test('nested cooling options retain IDs, quantities and unverified compatibility without inventing price', () => {
  const options = { coolerId: 'cooler-noctua-nh-u12s-redux', fans: [{ fanId: 'fan-arctic-p12-pwm-pst-5-pack', quantity: 2 }] };
  const input = { components: { ...build, ...options } };
  const selected = selectBuildComponents(input);
  assert.deepEqual(serializeBuildSelection(selected).fans, options.fans);
  assert.throws(() => calculateBuildPrice(selected), { statusCode: 422 });
  const upgrades = suggest(input);
  assert.equal(upgrades.currentBuildSummary.totalEstimatedPrice, null);
  assert.deepEqual(upgrades.suggestions, []);
  const plan = roadmap(input);
  assert.equal(plan.currentBuildSummary.totalEstimatedPrice, null);
  assert.equal(plan.initialCompatibility.status, 'unverified');
  assert.deepEqual(plan.steps, []);
});

test('explicit top-level cooling removal overrides nested options in upgrades and roadmap', () => {
  const input = { ...build, cooler: null, fans: [], components: {
    coolerId: 'cooler-noctua-nh-u12s-redux', fans: [{ fanId: 'fan-arctic-p12-pwm-pst-5-pack', quantity: 2 }]
  } };
  assert.equal(selectBuildComponents(input).cooler, undefined);
  assert.equal(suggest(input).currentBuildSummary.totalEstimatedPrice, null);
  const plan = roadmap(input);
  assert.equal(plan.currentBuildSummary.totalEstimatedPrice, null);
  assert.equal(plan.initialCompatibility.status, 'compatible');
});
