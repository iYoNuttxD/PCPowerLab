import { performanceMeasurementIdentity } from '../src/utils/performanceAvailability.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { currentBuild, installScenarioBuild } from './helpers/current-build.js';
import { performanceMetadata } from '../src/utils/performanceMethodology.js';
import { calculateBuildScore } from '../src/services/buildScoreService.js';
import { compareBuilds } from '../src/services/buildComparisonService.js';
import { generateBuildReport } from '../src/services/buildReportService.js';
import { exportBuildToJson } from '../src/services/buildExportService.js';
import { listComponentsByCostBenefit } from '../src/services/costBenefitService.js';
import { analyzeBuildBottlenecks } from '../src/services/bottleneck.service.js';
import { simulateGamePerformance, compareGamePerformance } from '../src/services/gamePerformanceService.js';
import { simulateProfessionalSoftwarePerformance, listProfessionalSoftware } from '../src/services/professionalSoftwareService.js';
import { recommendBuildByBudget } from '../src/services/recommendationService.js';
import { listReadyBuilds } from '../src/services/readyBuildsService.js';
import { suggestUpgrades } from '../src/services/upgradeSuggestionService.js';
import { generateUpgradeRoadmap } from '../src/services/upgradeRoadmapService.js';

const gpuId = 'gpu-msi-rtx-3050-lp-6g-oc';
const build = { ...currentBuild, gpuId };
function assertSimulated(result) {
  assert.equal(result.performanceBasis, 'simulated');
  assert.equal(result.performanceMethodology.basis, 'simulated');
  assert.equal(result.performanceMethodology.measuredBenchmark, false);
}
function assertProvisional(result) {
  assertSimulated(result);
  assert.equal(result.performanceMethodology.kind, 'synthetic-provisional');
  assert.equal(result.performanceMethodology.modelVersion, 'synthetic-catalog-v1');
  assert.ok(result.performanceMethodology.provisionalComponentIds.includes(gpuId));
}

test('provisional methodology survives score, comparison, report and JSON export', () => {
  const score = calculateBuildScore({ build });
  assertProvisional(score);
  assert.ok(Number.isFinite(score.criteria.performanceScore));
  assert.equal(score.criteria.balanceScore, null);
  const comparison = compareBuilds({ builds: [build, currentBuild], comparisonCriteria: 'performance' });
  assertSimulated(comparison);
  assertProvisional(comparison.builds[0]);
  assertProvisional(generateBuildReport({ build }));
  const exported = exportBuildToJson({ build, includeSummary: true });
  assertProvisional(exported);
  assertProvisional(exported.summary);
});

test('score-only profiles never unlock FPS, software requirements or bottlenecks', () => {
  const partial = { cpuId: build.cpuId, gpuId, ramId: build.ramId, storageId: build.storageId };
  const game = simulateGamePerformance({ build: partial, gameId: 'game-valorant' });
  const software = simulateProfessionalSoftwarePerformance({ build: partial, softwareId: listProfessionalSoftware()[0].id });
  const bottleneck = analyzeBuildBottlenecks(build);
  for (const result of [game, software, bottleneck]) {
    assertProvisional(result);
    assert.equal(result.available, false);
    assert.equal(result.reason, 'synthetic_model_not_simulation_calibrated');
  }
  const comparison = compareGamePerformance({ build: partial, gameIds: ['game-valorant', 'game-counter-strike-2'] });
  assertProvisional(comparison);
  assertProvisional(comparison.results[0]);
  assert.equal(game.estimatedFps, null);
  assert.equal(software.performanceScore, null);
  assert.equal(software.meetsMinimumRequirements, null);
  assert.equal(bottleneck.hasBottleneck, null);
});

test('rankings label synthetic scores without manufacturing measured evidence', () => {
  const ranked = listComponentsByCostBenefit({ category: 'gpu' });
  const entry = ranked.find(item => item.component.id === gpuId);
  assert.ok(entry);
  assertProvisional(entry);
  assert.ok(Number.isFinite(entry.performanceScore));
});

test('recommendations, presets and upgrades retain simulated methodology', () => {
  installScenarioBuild();
  assertSimulated(recommendBuildByBudget({ budget: { amount: 20000 }, usageType: 'gaming' }));
  for (const ready of listReadyBuilds()) assertSimulated(ready);
  const upgrades = suggestUpgrades({ build: currentBuild, budget: { amount: 20000 } });
  assertSimulated(upgrades);
  for (const suggestion of upgrades.suggestions) assertSimulated(suggestion);
  const roadmap = generateUpgradeRoadmap({ build: currentBuild, totalBudget: 20000 });
  assertSimulated(roadmap);
  for (const step of roadmap.steps) assertSimulated(step);
});

test('aggregate metadata requires verified measurement proof and excludes ancillary hardware', () => {
  const component = { id: 'fixture', category: 'gpu' };
  const spoofed = new Map([['fixture', { componentId: 'fixture', scoreBasis: 'measured', measurementEvidence: { sourceUrl: 'https://example.org', metric: 'score', observedAt: '2026-10-08T12:00:00Z', methodology: 'fixture' } }]]);
  assert.equal(performanceMetadata({ component }, spoofed).performanceMethodology.contributors[0].basis, 'simulated');
  const evidence = { ...spoofed.get('fixture'), measuredBenchmark: true, measurementEvidence: { ...spoofed.get('fixture').measurementEvidence, value: 123, reviewStatus: 'verified', componentIdentity: performanceMeasurementIdentity(component) } };
  const result = performanceMetadata({ component, psu: { id: 'psu', category: 'psu' } }, new Map([['fixture', evidence]]));
  assertSimulated(result);
  assert.equal(result.performanceMethodology.contributors.length, 1);
  assert.equal(result.performanceMethodology.contributors[0].basis, 'measured');
});
