import { estimateBuildParameters } from '../src/services/estimatedParametersService.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { components } from '../src/data/components.mock.js';
import { currentBuild } from './helpers/current-build.js';
import { selectBuildComponents, serializeBuildSelection } from '../src/services/build.service.js';
import { generateBuildSummary } from '../src/services/buildSummaryService.js';
import { simulateGamePerformance } from '../src/services/gamePerformanceService.js';
import { simulateProfessionalSoftwarePerformance, listProfessionalSoftware } from '../src/services/professionalSoftwareService.js';
import { recommendBuildByBudget } from '../src/services/recommendationService.js';
import { checkBuildCompatibility } from '../src/services/compatibility.service.js';
import { getPurchaseLinksByBuild } from '../src/services/purchaseLinksService.js';
import { simulateCooling } from '../frontend/src/utils/coolingSimulation.js';
import { estimatedParameter } from '../src/utils/estimatedPerformance.js';

const game = build => simulateGamePerformance({ build, gameId: 'game-valorant', targetResolution: '1080p', qualityPreset: 'high' });
const assertEstimate = result => {
  assert.equal(result.available, true);
  assert.ok(Number.isFinite(result.estimatedFps) && result.estimatedFps > 0);
  assert.ok(result.estimatedFpsRange.low <= result.estimatedFps && result.estimatedFpsRange.high >= result.estimatedFps);
  assert.equal(result.estimation.measuredBenchmark, false);
};
test('unknown installed BIOS and dimensions never suppress the selected build or independent outputs', () => {
  const build = { ...currentBuild, gpuId: 'gpu-pcyes-rx-550-edge-4gb', cpuId: 'cpu-ryzen-5-4500-box' };
  const summary = generateBuildSummary({ build, gameId: 'game-valorant', budget: { amount: 4000 } });
  assert.equal(summary.selectionStatus, 'complete');
  assertEstimate(summary.gamePerformance);
  assert.equal(summary.bottlenecks.available, true);
  assert.ok(!summary.compatibility.unverifiedChecks.some(check => /BIOS/.test(check.code)));
  assert.ok(summary.compatibility.unverifiedChecks.some(check => check.code === 'CASE_GPU_LENGTH_UNVERIFIED'));
  assert.equal(summary.components.gpu.id, build.gpuId);
  assert.ok(Number.isFinite(summary.totalEstimatedPrice));
  assert.ok(getPurchaseLinksByBuild(build));
});
for (const component of components.filter(c => ['cpu','gpu'].includes(c.category) && c.performanceModelStatus === 'unavailable' && c.active !== false)) {
  test(`uncalibrated ${component.id} produces a labeled range without manufacturing a benchmark`, () => {
    const build = { ...currentBuild, [`${component.category}Id`]: component.id };
    assertEstimate(game(build));
    const software = simulateProfessionalSoftwarePerformance({ build, softwareId: listProfessionalSoftware()[0].id });
    assert.equal(software.available, true);
    assert.equal(software.estimation.measuredBenchmark, false);
    assert.ok(Number.isFinite(software.performanceScore));
    assert.ok(software.performanceScoreRange.low >= 0 && software.performanceScoreRange.high <= 100);
  });
}
test('known socket conflicts stay visible while manual estimates and summaries remain usable', () => {
  const build = { ...currentBuild, cpuId: 'cpu-intel-i3-12100f' };
  assert.equal(checkBuildCompatibility(build).status, 'incompatible');
  const result = game(build);
  assertEstimate(result);
  assert.equal(result.estimation.scenarioOnly, true);
  const summary = generateBuildSummary({ build, gameId: 'game-valorant' });
  assert.equal(summary.compatibility.status, 'incompatible');
  assertEstimate(summary.gamePerformance);
});
test('automatic suggestions accept missing measurements, preserve budget and avoid established chipset conflicts', () => {
  for (const graphicsMode of ['dedicated', 'integrated']) {
    const result = recommendBuildByBudget({ budget: { amount: graphicsMode === 'integrated' ? 3000 : 4000 }, usageType: 'study', selectionMode: 'price-and-compatibility', graphicsMode });
    assert.ok(result.totalEstimatedPrice <= (graphicsMode === 'integrated' ? 3000 : 4000));
    const build = Object.fromEntries(Object.entries(result.components).map(([slot, part]) => [slot, part?.id || part]));
    assert.deepEqual(checkBuildCompatibility(build).alerts, []);
    assertEstimate(game(build));
  }
});
test('integrated graphics estimates include shared RAM and no invented dedicated product or price', () => {
  const proposal = recommendBuildByBudget({ budget: { amount: 3000 }, usageType: 'study', graphicsMode: 'integrated' });
  assert.equal(proposal.components.gpu, undefined);
  assert.equal(proposal.components.graphicsMode, 'integrated');
  const parameters=estimateBuildParameters(proposal.components,['cpu','gpu','ram','storage']);
  assert.equal(parameters.ram.systemCapacityGb,16);assert.equal(parameters.ram.capacity,14);
  assert.equal(proposal.components.ram.specs.capacityGb,16);
  assertEstimate(game(serializeBuildSelection(proposal.components)));
  assert.ok(game(serializeBuildSelection(proposal.components)).estimation.assumptions.some(text => /2 GB/.test(text)));
});
test('temperature and cooling noise are estimated with no cooler profile, and malformed inputs stay invalid', () => {
  const selected = selectBuildComponents(currentBuild);
  const result = simulateCooling({ cpu: selected.cpu, caseComponent: selected.case });
  assert.equal(result.thermal.available, true);
  assert.equal(result.thermal.heuristicFallback, true);
  assert.ok(result.thermal.scenarioBands.every(row => row.temperatureCelsius.low <= row.temperatureCelsius.central && row.temperatureCelsius.central <= row.temperatureCelsius.high));
  assert.equal(result.acoustics.available, true);
  assert.equal(result.acoustics.distanceM, 1);
  assert.ok(result.acoustics.assumptions.some(text => /Não inclui GPU/.test(text)));
  assert.equal(simulateCooling({ cpu: selected.cpu, conditions: { inletCelsius: '25' } }).thermal.available, false);
});
test('approximate coefficients preserve explicit parameters and never mutate factual specifications', () => {
  const component = { id:'unknown', category:'cpu', name:'Unknown CPU', specs:{ threads:12, tdpWatts:65 } };
  const copy = globalThis.structuredClone(component);
  const estimated = estimatedParameter(component);
  assert.equal(estimated.heuristicFallback, true);
  assert.ok(estimated.performanceScore >= 0 && estimated.performanceScore <= 100);
  assert.deepEqual(component, copy);
  assert.equal(estimatedParameter(component, { type:'cpu', performanceScore:74 }).performanceScore, 74);
});
