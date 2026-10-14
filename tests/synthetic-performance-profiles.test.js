import { updateAdminComponent } from '../src/services/admin-component.service.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { components } from '../src/data/components.mock.js';
import { performanceParameters } from '../src/data/performanceParameters.js';
import { createSyntheticPerformanceParameter } from '../src/data/synthetic-performance-profiles.js';
import { findPerformanceParameterRecordByComponentId } from '../src/data/performance-parameter.repository.js';
import { findComponentById, listComponents } from '../src/services/component.service.js';
import { getPerformanceScore } from '../src/utils/costBenefitUtils.js';
import { unavailablePerformance, hasVerifiedMeasurementEvidence, performanceMeasurementIdentity } from '../src/utils/performanceAvailability.js';
import { listComponentsByCostBenefit } from '../src/services/costBenefitService.js';
import { calculateBuildScore } from '../src/services/buildScoreService.js';
import { simulateGamePerformance } from '../src/services/gamePerformanceService.js';
import { simulateProfessionalSoftwarePerformance, listProfessionalSoftware } from '../src/services/professionalSoftwareService.js';
import { analyzeBuildBottlenecks } from '../src/services/bottleneck.service.js';
import { exportBuildToJson } from '../src/services/buildExportService.js';
import { recommendBuildByBudget } from '../src/services/recommendationService.js';
import { createPerformanceParameters, deletePerformanceParameters } from '../src/services/performanceParametersService.js';
import { performanceMetadata } from '../src/utils/performanceMethodology.js';
import { currentBuild } from './helpers/current-build.js';

const expected = {
  'gpu-msi-rtx-3050-lp-6g-oc': 45,
  'gpu-gigabyte-rtx-5060-ti-eagle-oc-ice-8g': 86,
  'gpu-gigabyte-rtx-5070-windforce-oc-sff-12g': 94,
  'gpu-asrock-rx-9060-xt-challenger-16g-oc': 86,
  'gpu-xfx-rx-9070-xt-swift-white-16g': 97,
  'cpu-intel-i5-14600k-box': 90,
  'ram-ax5u6000c4816g-slabrbk': 68,
  'hdd-st2000dm008': 25
};
for (const [id, value] of Object.entries(expected)) test(`provisional exact-model score stays explicit and score-only: ${id}`, () => {
  const component = findComponentById(id);
  const parameter = findPerformanceParameterRecordByComponentId(id);
  assert.equal(component.performanceScore, value);
  assert.equal(listComponents().find(item => item.id === id).performanceScore, value);
  assert.equal(parameter.performanceScore, value);
  assert.equal(parameter.gamingScore, value);
  assert.equal(parameter.productivityScore, value);
  assert.equal(parameter.scoreKind, 'synthetic-provisional');
  assert.equal(parameter.modelVersion, 'synthetic-catalog-v1');
  assert.equal(parameter.measuredBenchmark, false);
  assert.equal(parameter.simulationSupported, false);
  assert.equal(component.performanceMethodology.basis, 'simulated');
  assert.equal(component.performanceMethodology.shortLabel, 'Pontuação simulada');
  assert.equal(getPerformanceScore(component, parameter), value);
  assert.equal(unavailablePerformance({ [component.category]: component }).reason, 'synthetic_model_not_simulation_calibrated');
  assert.equal(parameter.tdp, undefined, 'No watts invented to unlock analysis');
  assert.equal(parameter.writeSpeed, undefined, 'No sustained write throughput invented');
  assert.equal(createSyntheticPerformanceParameter({ ...component, partNumber: 'unrelated' }), null);
  const changedInputs = { ...component.specs, [Object.keys(parameter.scoreInputs)[0]]: 'changed' };
  assert.equal(createSyntheticPerformanceParameter({ ...component, specs: changedInputs }), null);
  assert.equal(getPerformanceScore(component, { ...parameter, performanceScore: 50 }), null);
  const entry = listComponentsByCostBenefit({ category: component.category }).find(item => item.component.id === id);
  assert.ok(entry, 'Explicit provisional model participates in relative value ranking');
  assert.equal(entry.performanceBasis, 'simulated');
});

test('synthetic profiles are separate from verified specifications and old calibrated scores', () => {
  assert.equal(performanceParameters.filter(p => p.scoreKind === 'synthetic-provisional').length, 8);
  assert.equal(findPerformanceParameterRecordByComponentId('cpu-ryzen-5-5500').performanceScore, 62);
  assert.equal(findPerformanceParameterRecordByComponentId('cpu-intel-i5-13600k').performanceScore, 90);
  assert.equal(findComponentById('cpu-ryzen-5-5500').performanceMethodology.basis, 'simulated');
  for (const id of Object.keys(expected)) {
    const component = components.find(item => item.id === id);
    assert.equal(component.specs.performanceScore, undefined);
    assert.equal(component.specs.modelVersion, undefined);
  }
  const ram = findPerformanceParameterRecordByComponentId('ram-ax5u6000c4816g-slabrbk');
  const { capacityGb, speedMhz, nominalCasLatencyNs } = ram.scoreInputs;
  assert.equal(ram.performanceScore, Math.min(92, 50 + capacityGb / 2 + (speedMhz - 3200) / 200) - Math.max(0, nominalCasLatencyNs - 12));
});

test('scores rank and serialize while unsupported FPS, software and physical bottleneck results stay absent', () => {
  const build = { ...currentBuild, gpuId: 'gpu-msi-rtx-3050-lp-6g-oc' };
  const score = calculateBuildScore({ build, budget: { amount: 8000 } });
  assert.ok(Number.isFinite(score.criteria.performanceScore));
  assert.equal(score.performanceBasis, 'simulated');
  assert.equal(score.criteria.balanceScore, null);
  assert.equal(score.source.hasBottleneck, null);
  assert.equal(score.overallScore, null, 'Unknown balance does not become a fictitious complete build grade');
  // Four-slot simulation isolates the score gate; the full build separately retains its connector uncertainty.
  const simulationBuild = Object.fromEntries(['cpuId', 'gpuId', 'ramId', 'storageId'].map(key => [key, build[key]]));
  const game = simulateGamePerformance({ build: simulationBuild, gameId: 'game-valorant' });
  assert.equal(game.estimatedFps, null);
  assert.equal(game.meetsMinimumRequirements, null);
  assert.equal(game.scoreOnly, true);
  const software = simulateProfessionalSoftwarePerformance({ build: simulationBuild, softwareId: listProfessionalSoftware()[0].id });
  assert.equal(software.performanceScore, null);
  assert.equal(software.meetsRecommendedRequirements, null);
  assert.equal(analyzeBuildBottlenecks(build).hasBottleneck, null);
  const exported = JSON.stringify(exportBuildToJson({ build, includeSummary: true }));
  assert.ok(exported.includes('synthetic-provisional'));
  assert.ok(exported.includes('simulated'));
  assert.ok(!exported.includes('NaN'));
  const recommendation = recommendBuildByBudget({ budget: { amount: 8000 }, usageType: 'gaming' });
  assert.equal(recommendation.performanceBasis, 'simulated');
  assert.ok(recommendation.totalEstimatedPrice <= 8000);
});

test('reviewed measured score takes priority without treating a score as FPS calibration', () => {
  const component = findComponentById('cpu-intel-i5-14600k-box');
  const provisional = findPerformanceParameterRecordByComponentId(component.id);
  const measured = { ...provisional, performanceScore: 91, gamingScore: 91, productivityScore: 91,
    scoreBasis: 'measured', measuredBenchmark: true, scoreKind: 'normalized-reviewed-benchmark',
    measurementEvidence: { reviewStatus: 'verified', componentIdentity: performanceMeasurementIdentity(component), sourceUrl: 'https://example.com/test-fixture-benchmark', metric: 'fixture score', value: 123,
      methodology: 'Test-only normalized score; not a published hardware benchmark', observedAt: '2026-10-08T12:00:00Z' } };
  assert.equal(hasVerifiedMeasurementEvidence({ ...measured, measurementEvidence: { ...measured.measurementEvidence, reviewStatus: 'unreviewed' } }, component), false);
  assert.equal(hasVerifiedMeasurementEvidence({ ...measured, measurementEvidence: { ...measured.measurementEvidence, observedAt: '2026-02-30T12:00:00Z' } }, component), false);
  assert.equal(hasVerifiedMeasurementEvidence({ ...measured, measurementEvidence: { ...measured.measurementEvidence, sourceUrl: 'https://' } }, component), false);
  assert.equal(getPerformanceScore(component, measured), 91);
  assert.equal(getPerformanceScore({ ...component, specs: { ...component.specs, cores: 99 } }, measured), null);
  assert.equal(getPerformanceScore(component, { ...measured, measuredBenchmark: false }), null);
  const index = performanceParameters.findIndex(p => p.componentId === component.id);
  try {
    performanceParameters[index] = measured;
    assert.equal(findComponentById(component.id).performanceScore, 91);
    assert.equal(findComponentById(component.id).performanceMethodology.basis, 'measured');
    assert.equal(unavailablePerformance({ cpu: component }).available, false, 'A normalized benchmark score alone is not an FPS calibration');
  } finally { performanceParameters[index] = provisional; }
});


test('fresh measured-score API records do not grant simulation permission or lose contributor evidence', () => {
  const id = 'gpu-msi-rtx-3050-lp-6g-oc';
  const original = findPerformanceParameterRecordByComponentId(id);
  const componentIndex = components.findIndex(item => item.id === id);
  const originalComponent = components[componentIndex];
  const build = { cpuId: currentBuild.cpuId, gpuId: id, ramId: currentBuild.ramId, storageId: currentBuild.storageId };
  const componentIdentity = performanceMeasurementIdentity(findComponentById(id));
  const fresh = { componentId: id, type: 'gpu', performanceScore: 45,
    scoreBasis: 'measured', measuredBenchmark: true, scoreKind: 'normalized-reviewed-benchmark',
    measurementEvidence: { reviewStatus: 'verified', componentIdentity, sourceUrl: 'https://example.com/test-fixture-benchmark', metric: 'score', value: 123,
      methodology: 'Test-only normalized score, not FPS calibration', observedAt: '2026-10-08T12:00:00Z' } };
  try {
    for (const simulationSupported of [undefined, null, false, 'true', 1, true]) {
      deletePerformanceParameters(id);
      createPerformanceParameters({ ...fresh, ...(simulationSupported !== undefined && { simulationSupported }) });
      const component = findComponentById(id);
      assert.equal(component.performanceScore, 45);
      assert.equal(component.performanceMethodology.basis, 'measured');
      assert.equal(component.performanceMethodology.simulationSupported, false, 'Flag alone is not a versioned simulator profile');
      const result = simulateGamePerformance({ build, gameId: 'game-valorant' });
      assert.equal(result.estimatedFps, null);
      assert.equal(result.meetsMinimumRequirements, null);
      assert.equal(result.meetsRecommendedRequirements, null);
      const ranked = listComponentsByCostBenefit({ category: 'gpu' }).find(entry => entry.component.id === id);
      assert.equal(ranked.performanceBasis, 'simulated');
      assert.equal(ranked.performanceMethodology.contributors.find(entry => entry.componentId === id).basis, 'measured');
      const metadata = performanceMetadata({ gpu: component });
      assert.equal(metadata.performanceMethodology.contributors[0].basis, 'measured');
      updateAdminComponent(id, { specs: { vramGb: 8 } });
      assert.equal(findComponentById(id).performanceScore, null, 'A changed exact identity invalidates the reviewed measurement');
      assert.ok(!listComponentsByCostBenefit({ category: 'gpu' }).some(entry => entry.component.id === id));
      components[componentIndex] = originalComponent;
    }
  } finally {
    deletePerformanceParameters(id);
    performanceParameters.push(original);
    components[componentIndex] = originalComponent;
  }
});
