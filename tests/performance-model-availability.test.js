import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { components } from '../src/data/components.mock.js';
import { performanceParameters } from '../src/data/performanceParameters.js';
import { getPerformanceScore, calculateCostBenefitScore, calculateBuildPerformanceScore } from '../src/utils/costBenefitUtils.js';
import { calculateBuildCostBenefitScore, calculateComparisonScore } from '../src/utils/comparisonUtils.js';
import { calculateBuildScore } from '../src/services/buildScoreService.js';
import { compareBuilds } from '../src/services/buildComparisonService.js';
import { listComponentsByCostBenefit } from '../src/services/costBenefitService.js';
import { recommendBuildByBudget } from '../src/services/recommendationService.js';
import { suggestUpgrades } from '../src/services/upgradeSuggestionService.js';
import { simulateGamePerformance, compareGamePerformance } from '../src/services/gamePerformanceService.js';
import { simulateProfessionalSoftwarePerformance, listProfessionalSoftware } from '../src/services/professionalSoftwareService.js';
import { analyzeBuildBottlenecks } from '../src/services/bottleneck.service.js';
import { selectBuildComponents, serializeBuildSelection } from '../src/services/build.service.js';
import { listComponents } from '../src/services/component.service.js';
import { generateBuildReport } from '../src/services/buildReportService.js';
import { exportBuildToJson } from '../src/services/buildExportService.js';

test('every processing category without parameters remains unknown, never neutral fifty', () => {
  for (const category of ['cpu', 'gpu', 'ram', 'storage']) {
    const component = { id: `missing-${category}`, category, price: 100 };
    assert.equal(getPerformanceScore(component, null), null, category);
    assert.equal(calculateCostBenefitScore(component, null), null, category);
    assert.equal(calculateBuildPerformanceScore({ [category]: component }, new Map(), 'general'), null, category);
  }
  assert.equal(getPerformanceScore({ category: 'psu' }, null), 50, 'Ancillary neutral weighting is separate from an unknown processing model.');
});

const originals = { cpu: 'cpu-ryzen-5-5600', motherboard: 'mb-b550m-aorus-elite', gpu: 'gpu-rtx-4060', ram: 'ram-kingston-fury-16gb-ddr4', storage: 'ssd-kingston-nv2-1tb', psu: 'psu-corsair-650w', case: 'case-mid-tower-airflow' };
const build = Object.fromEntries(Object.keys(originals).map(slot => [`${slot}Id`, `calibration-test-${slot}`]));
const unavailableId = 'calibration-test-unavailable-gpu';
const unknownBuild = { ...build, gpuId: unavailableId };
const prefix = 'calibration-test-';
const cloneRecord = value => JSON.parse(JSON.stringify(value));
before(() => {
  for (const [slot, originalId] of Object.entries(originals)) {
    const source = components.find(component => component.id === originalId);
    const clone = cloneRecord(source);
    Object.assign(clone, { id: build[`${slot}Id`], active: true, lifecycle: 'active', price: 500, priceKind: 'estimated-reference' });
    delete clone.datedReferenceIdentity;
    delete clone.estimatedPrice;
    components.push(clone);
    const parameter = performanceParameters.find(parameter => parameter.componentId === originalId);
    if (parameter) performanceParameters.push({ ...cloneRecord(parameter), componentId: clone.id });
  }
  components.push({ ...cloneRecord(components.find(component => component.id === build.gpuId)), id: unavailableId, price: 1, performanceModelStatus: 'unavailable' });
});
after(() => {
  for (let i = components.length - 1; i >= 0; i--) if (components[i].id.startsWith(prefix)) components.splice(i, 1);
  for (let i = performanceParameters.length - 1; i >= 0; i--) if (performanceParameters[i].componentId.startsWith(prefix)) performanceParameters.splice(i, 1);
});

test('CPU/GPU without calibration are null; ancillary fallback and calibrated scores stay intact', () => {
  for (const category of ['cpu', 'gpu']) {
    const component = { id: category, category, price: 1 };
    assert.equal(getPerformanceScore(component), null);
    assert.equal(calculateCostBenefitScore(component), null);
    assert.equal(getPerformanceScore({ ...component, performanceModelStatus: 'unavailable' }, { performanceScore: 99 }), null);
    assert.equal(getPerformanceScore(component, { performanceScore: 76, gamingScore: 81 }, 'gaming'), 81);
  }
  assert.equal(getPerformanceScore({ category: 'motherboard' }), 50);
  assert.equal(getPerformanceScore({ category: 'cooler' }), 0);
  const selected = selectBuildComponents(unknownBuild);
  const parameters = new Map(performanceParameters.map(parameter => [parameter.componentId, parameter]));
  assert.equal(calculateBuildPerformanceScore(selected, parameters, 'gaming'), null);
  assert.equal(calculateBuildCostBenefitScore({ components: selected, performanceByComponentId: parameters, usageType: 'gaming' }), null);
  assert.equal(calculateComparisonScore({ build: { performanceScore: null }, criteria: 'performance' }), null);
});

test('manual selection and serialization preserve exact unavailable model without zero scores', () => {
  const selected = selectBuildComponents(unknownBuild);
  assert.equal(selected.gpu.id, unavailableId);
  assert.equal(serializeBuildSelection(selected).gpu, unavailableId);
  const catalogEntry = listComponents({ category: 'gpu' }).find(component => component.id === unavailableId);
  assert.equal(catalogEntry.selectable, true);
  assert.equal(catalogEntry.performanceScore, null);
  const score = JSON.parse(JSON.stringify(calculateBuildScore({ build: unknownBuild, budget: { amount: 5000 } })));
  assert.equal(score.available, false);
  assert.equal(score.overallScore, null);
  assert.equal(score.criteria.performanceScore, null);
  assert.equal(score.criteria.costBenefitScore, null);
  assert.equal(score.criteria.balanceScore, null);
  const exported = exportBuildToJson({ build: unknownBuild, includeSummary: true });
  assert.ok(JSON.stringify(exported).includes(unavailableId));
  assert.ok(!JSON.stringify(exported).includes('NaN'));
});

test('uncalibrated products cannot win cost-benefit, recommendations, comparisons, or upgrades', () => {
  assert.ok(!listComponentsByCostBenefit({ category: 'gpu' }).some(entry => entry.component.id === unavailableId));
  const recommendation = recommendBuildByBudget({ budget: { amount: 8000 }, usageType: 'gaming' });
  assert.notEqual(recommendation.components.gpu.id, unavailableId);
  const result = compareBuilds({ builds: [{ name: 'Unknown', build: unknownBuild }, { name: 'Calibrated', build }], comparisonCriteria: 'performance' });
  assert.equal(result.builds[0].performanceScore, null);
  assert.equal(result.builds[0].comparisonScore, null);
  assert.equal(result.recommendedBuild.name, 'Calibrated');
  for (const criteria of ['balanced', 'budget', 'cost-benefit']) {
    const compared = compareBuilds({ builds: [{ build: unknownBuild }, { build: unknownBuild }], comparisonCriteria: criteria });
    assert.equal(compared.recommendedBuild.available, false);
    assert.ok(compared.builds.every(build => build.comparisonScore === null));
  }
  const upgrades = suggestUpgrades({ build: unknownBuild, budget: { amount: 5000 } });
  assert.ok(upgrades.suggestions.every(item => item.componentType !== 'gpu' && item.suggestedComponent.id !== unavailableId));
});

test('explicit model gaps yield no invented game/pro score, FPS, requirement verdict, or bottleneck', () => {
  const gameInput = { build: unknownBuild, gameId: 'game-cyberpunk-2077' };
  const game = simulateGamePerformance(gameInput);
  assert.equal(game.available, false);
  assert.equal(game.estimatedFps, null);
  assert.equal(game.meetsMinimumRequirements, null);
  const compared = compareGamePerformance({ build: unknownBuild, gameIds: ['game-cyberpunk-2077', 'game-valorant'] });
  assert.ok(compared.results.every(game => game.estimatedFps === null));
  assert.ok(!compared.summary.includes('0 FPS'));
  const software = simulateProfessionalSoftwarePerformance({ build: unknownBuild, softwareId: listProfessionalSoftware()[0].id });
  assert.equal(software.performanceScore, null);
  assert.equal(software.available, false);
  const bottleneck = analyzeBuildBottlenecks(unknownBuild);
  assert.equal(bottleneck.hasBottleneck, null);
  assert.equal(bottleneck.available, false);
  const calibrated = simulateGamePerformance({ ...gameInput, build });
  const legacy = simulateGamePerformance({ ...gameInput, build: Object.fromEntries(Object.entries(originals).map(([slot, id]) => [`${slot}Id`, id])) });
  assert.equal(calibrated.estimatedFps, legacy.estimatedFps);
  assert.ok(calibrated.estimatedFps > 0);
  assert.ok(Number.isFinite(calculateBuildScore({ build, budget: { amount: 5000 } }).overallScore));
});

test('explicit RAM model gap overrides existing scores and suppresses simulations and upgrade gains', () => {
  const ram = components.find(component => component.id === build.ramId);
  ram.performanceModelStatus = 'unavailable';
  try {
    const parameter = performanceParameters.find(parameter => parameter.componentId === ram.id);
    assert.ok(Number.isFinite(parameter.performanceScore));
    assert.equal(getPerformanceScore(ram, parameter), null);
    assert.equal(listComponents({ category: 'ram' }).find(component => component.id === ram.id).performanceScore, null);
    assert.ok(!listComponentsByCostBenefit({ category: 'ram' }).some(entry => entry.component.id === ram.id));
    assert.equal(calculateBuildScore({ build }).criteria.performanceScore, null);
    assert.equal(simulateGamePerformance({ build, gameId: 'game-valorant' }).estimatedFps, null);
    assert.equal(simulateProfessionalSoftwarePerformance({ build, softwareId: listProfessionalSoftware()[0].id }).performanceScore, null);
    assert.equal(analyzeBuildBottlenecks(build).hasBottleneck, null);
    assert.ok(suggestUpgrades({ build }).suggestions.every(item => item.componentType !== 'ram'));
  } finally {
    delete ram.performanceModelStatus;
  }
});

for (const slot of ['ram', 'storage']) {
  for (const failure of ['missing', 'invalid-score', 'wrong-type']) {
    test(`unflagged ${slot} with ${failure} model stays unknown across real services and serialization`, () => {
      const id = build[`${slot}Id`];
      const index = performanceParameters.findIndex(parameter => parameter.componentId === id);
      const original = performanceParameters[index];
      if (failure === 'missing') performanceParameters.splice(index, 1);
      else performanceParameters[index] = { ...original, ...(failure === 'wrong-type' ? { type: 'cpu' } : { performanceScore: NaN }) };
      try {
        assert.equal(listComponents({ category: slot }).find(component => component.id === id).performanceScore, null);
        assert.ok(!listComponentsByCostBenefit({ category: slot }).some(entry => entry.component.id === id));
        const recommendation = recommendBuildByBudget({ budget: { amount: 20000 }, usageType: 'gaming' });
        assert.notEqual(recommendation.components[slot].id, id);
        const score = JSON.parse(JSON.stringify(calculateBuildScore({ build, budget: { amount: 5000 } })));
        assert.equal(score.overallScore, null);
        assert.equal(score.criteria.performanceScore, null);
        assert.equal(score.criteria.costBenefitScore, null);
        assert.equal(score.source.hasBottleneck, null);
        const comparison = compareBuilds({ builds: [{ build }, { build }], comparisonCriteria: 'performance' });
        assert.equal(comparison.recommendedBuild.available, false);
        assert.ok(comparison.builds.every(entry => entry.performanceScore === null && entry.hasBottleneck === null));
        const upgrades = suggestUpgrades({ build });
        assert.equal(upgrades.currentBuildSummary.hasBottleneck, null);
        assert.ok(upgrades.suggestions.every(item => item.componentType !== slot));
        const game = simulateGamePerformance({ build, gameId: 'game-valorant' });
        assert.equal(game.available, false);
        assert.equal(game.estimatedFps, null);
        assert.equal(game.meetsMinimumRequirements, null);
        const software = simulateProfessionalSoftwarePerformance({ build, softwareId: listProfessionalSoftware()[0].id });
        assert.equal(software.available, false);
        assert.equal(software.performanceScore, null);
        assert.equal(analyzeBuildBottlenecks(build).hasBottleneck, null);
        const exported = JSON.parse(JSON.stringify(exportBuildToJson({ build, includeSummary: true })));
        assert.ok(JSON.stringify(exported).includes(id));
        assert.equal(exported.summary.compatibilityStatus, 'compatible');
        const report = JSON.parse(JSON.stringify(generateBuildReport({ build })));
        assert.equal(report.bottlenecks.hasBottleneck, null);
        assert.equal(report.score.source.hasBottleneck, null);
      } finally {
        if (failure === 'missing') performanceParameters.splice(index, 0, original);
        else performanceParameters[index] = original;
      }
    });
  }
}
