import test from 'node:test';
import assert from 'node:assert/strict';
import { addComponentRecord } from '../src/data/component.repository.js';
import { selectBuildComponents, calculateBuildPrice } from '../src/services/build.service.js';
import { listPerformanceParameters } from '../src/services/performanceParametersService.js';
import { calculateBuildPerformanceScore, getPerformanceScore } from '../src/utils/costBenefitUtils.js';
import { calculateBuildCostBenefitScore } from '../src/utils/comparisonUtils.js';
import { recommendBuildByBudget, recommendBuildsByBudgetRange } from '../src/services/recommendationService.js';
import { suggestUpgrades } from '../src/services/upgradeSuggestionService.js';
import { generateUpgradeRoadmap } from '../src/services/upgradeRoadmapService.js';
import { suggestCompatibilityFixes } from '../src/services/compatibilityFixService.js';
import { simulateGamePerformance } from '../src/services/gamePerformanceService.js';
import { simulateProfessionalSoftwarePerformance, listProfessionalSoftware } from '../src/services/professionalSoftwareService.js';
import { calculateBuildScore } from '../src/services/buildScoreService.js';
import { listComponentsByCostBenefit } from '../src/services/costBenefitService.js';

const base = {
  cpuId: 'cpu-ryzen-5-5600', motherboardId: 'mb-b550m-aorus-elite', gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4', storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w', caseId: 'case-mid-tower-airflow'
};
const cooler = addComponentRecord({ id: 'cooler-regression-unverified', name: 'Test cooler', category: 'cooler', price: 250,
  specs: { coolingType: 'air', supportedSockets: ['AM4'], heightMm: 150, powerWatts: 2 } });
const fan = addComponentRecord({ id: 'fan-regression-pack', name: 'Test fan pack', category: 'fan', price: 90,
  specs: { diameterMm: 120, thicknessMm: 25, unitsPerPack: 3, powerWatts: 1 } });
const cooling = { coolerId: cooler.id, fans: [{ fanId: fan.id, quantity: 2 }] };
const withCooling = { ...base, ...cooling };
const performanceByComponentId = new Map(listPerformanceParameters().map((entry) => [entry.componentId, entry]));

test('cooling costs include pack quantities without fabricated performance or NaN', () => {
  const plain = selectBuildComponents(base);
  const cooled = selectBuildComponents(withCooling);
  assert.equal(calculateBuildPrice(cooled), calculateBuildPrice(plain) + 430);
  assert.equal(calculateBuildPerformanceScore(cooled, performanceByComponentId, 'gaming'),
    calculateBuildPerformanceScore(plain, performanceByComponentId, 'gaming'));
  assert.equal(getPerformanceScore(cooler, { performanceScore: 100 }), 0);
  const score = (components) => calculateBuildCostBenefitScore({ components, performanceByComponentId, usageType: 'gaming' });
  assert.ok(Number.isFinite(score(cooled)));
  assert.ok(score(cooled) < score(plain));
  const buildScore = calculateBuildScore({ build: withCooling, usageType: 'gaming' });
  assert.ok(Number.isFinite(buildScore.overallScore));
  assert.equal(buildScore.source.totalEstimatedPrice, calculateBuildPrice(cooled));
});

test('recommendations reject uncertain selected cooling instead of dropping it', () => {
  assert.throws(() => recommendBuildByBudget({ budget: { amount: 5000 }, ...cooling }), { statusCode: 422 });
  assert.throws(() => recommendBuildsByBudgetRange({ budgetRange: { min: 100, max: 5000 }, components: cooling }), { statusCode: 422 });
  assert.throws(() => recommendBuildByBudget({ budget: { amount: 5000 }, fans: [{ fanId: fan.id, quantity: 0 }] }), { statusCode: 400 });
});

test('upgrades and roadmap retain cooling in prices and reject unverified candidates', () => {
  const result = suggestUpgrades({ build: withCooling, budget: { amount: 100 }, usageType: 'gaming' });
  assert.equal(result.currentBuildSummary.totalEstimatedPrice, calculateBuildPrice(selectBuildComponents(withCooling)));
  assert.deepEqual(result.suggestions, []);
  const roadmap = generateUpgradeRoadmap({ build: { components: withCooling }, totalBudget: 100 });
  assert.equal(roadmap.initialCompatibility.compatible, false);
  assert.ok(roadmap.initialCompatibility.unverifiedChecks.length > 0);
  assert.deepEqual(roadmap.steps, []);
});

test('compatibility fixes do not silently discard selected accessories', () => {
  const fixes = suggestCompatibilityFixes({ ...withCooling, psuId: 'psu-generic-400w' });
  assert.equal(fixes.compatible, false);
  assert.ok(fixes.unverifiedChecks.length > 0);
  assert.deepEqual(fixes.suggestions, []);
});

test('game FPS and professional scores are unchanged by cooling selections', () => {
  const simulation = { gameId: 'game-cyberpunk-2077', targetResolution: '1080p', qualityPreset: 'high' };
  assert.equal(simulateGamePerformance({ ...simulation, build: withCooling }).estimatedFps,
    simulateGamePerformance({ ...simulation, build: base }).estimatedFps);
  const softwareId = listProfessionalSoftware()[0].id;
  assert.equal(simulateProfessionalSoftwarePerformance({ softwareId, build: withCooling }).performanceScore,
    simulateProfessionalSoftwarePerformance({ softwareId, build: base }).performanceScore);
  assert.deepEqual(listComponentsByCostBenefit({ category: 'cooler' }), []);
  assert.deepEqual(listComponentsByCostBenefit({ category: 'fan' }), []);
});


test('known air cooler height never substitutes for unknown RAM and VRM clearance', () => {
  const originalCase = selectBuildComponents(base).case;
  addComponentRecord({ ...originalCase, id: 'case-regression-cooler-ready', name: 'Test cooler-ready case', price: 100,
    specs: { ...originalCase.specs, maxCoolerHeightMm: 200 } });
  assert.throws(() => recommendBuildByBudget({ budget: { amount: 5000 }, coolerId: cooler.id }), { statusCode: 422 });
  assert.throws(() => recommendBuildsByBudgetRange({ budgetRange: { min: 3000, max: 5000 }, components: { cooler: cooler.id } }), { statusCode: 422 });
});
