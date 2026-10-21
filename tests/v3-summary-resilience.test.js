import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuildSummaryGenerator, generateBuildSummary } from '../src/services/buildSummaryService.js';
import { recommendBuildByBudget, recommendBuildsByBudgetRange } from '../src/services/recommendationService.js';
import { checkBuildCompatibility } from '../src/services/compatibility.service.js';
import { selectBuildComponents, serializeBuildSelection } from '../src/services/build.service.js';
import { getPurchaseLinksByBuild } from '../src/services/purchaseLinksService.js';
import { replaceBuildComponent } from '../frontend/src/utils/buildTransitions.js';
import { currentBuild, currentBuildTotal } from './helpers/current-build.js';

const input = () => ({
  build: { ...currentBuild }, budget: { amount: 10000, currency: 'BRL', priority: 'cost-benefit' },
  usageType: 'gaming', gameId: 'game-cyberpunk-2077', targetResolution: '1080p', qualityPreset: 'high'
});
const fail = () => { throw new Error('private implementation detail'); };

for (const section of ['bottlenecks', 'gamePerformance', 'recommendation', 'selectionExplanation']) {
  test(`v3: unexpected ${section} failure is scoped to that section, not missing selections`, () => {
    const payload = input();
    const before = globalThis.structuredClone(payload);
    const result = createBuildSummaryGenerator({ [section]: fail })(payload);
    const failed = section === 'recommendation' ? result.recommendationObservation : result[section];
    assert.equal(result.selectionStatus, 'complete');
    assert.equal(result.analysisStatus, 'partial');
    assert.equal(result.compatibility.compatible, true);
    assert.equal(result.totalEstimatedPrice, currentBuildTotal());
    assert.equal(result.budgetStatus.status, 'within_budget');
    assert.equal(failed.available, false);
    assert.equal(failed.reason, 'analysis_failed');
    assert.equal(failed.retryable, true);
    assert.deepEqual(failed.errors, []);
    assert.doesNotMatch(JSON.stringify(result), /private implementation detail/);
    if (section !== 'gamePerformance') assert.ok(result.gamePerformance.estimatedFps > 0);
    if (section !== 'bottlenecks') assert.equal(typeof result.bottlenecks.hasBottleneck, 'boolean');
    assert.deepEqual(payload, before);
    assert.deepEqual(serializeBuildSelection(result.components), serializeBuildSelection(selectBuildComponents(payload.build)));
  });
}

test('v3: compatibility outage preserves parts, prices, bottlenecks and alternative-build research, without gating independent FPS', () => {
  let simulations = 0;
  const result = createBuildSummaryGenerator({ compatibility: fail, gamePerformance: () => { simulations += 1; return { available:true, estimatedFps:60, estimatedFpsRange:{low:40,high:80} }; } })(input());
  assert.equal(simulations, 1);
  assert.equal(result.compatibility.available, false);
  assert.equal(result.compatibility.compatible, null);
  assert.equal(result.compatibility.status, 'unavailable');
  assert.equal(result.sections.compatibility.reason, 'analysis_failed');
  assert.equal(result.totalEstimatedPrice, currentBuildTotal());
  assert.equal(result.budgetStatus.status, 'within_budget');
  assert.equal(typeof result.bottlenecks.hasBottleneck, 'boolean');
  assert.equal(result.gamePerformance.estimatedFps, 60);
  assert.equal(result.recommendationObservation.available, true);
  assert.match(result.summary, /temporariamente indisponível/);
  assert.doesNotMatch(result.summary, /possui incompatibilidades/);
});

test('v3: invalid optional inputs do not erase a complete build or mislabel a server outage as missing data', () => {
  const result = generateBuildSummary({ ...input(), gameId: 'game-not-found', budget: { amount: -1 } });
  assert.equal(result.selectionStatus, 'complete');
  assert.equal(result.compatibility.compatible, true);
  assert.equal(result.budgetStatus.reason, 'invalid_analysis_input');
  assert.equal(result.budgetStatus.retryable, false);
  assert.equal(result.gamePerformance.reason, 'invalid_analysis_input');
  assert.match(result.gamePerformance.errors.join(' '), /Jogo nao encontrado/);
  assert.equal(result.totalEstimatedPrice, currentBuildTotal());
  assert.equal(result.recommendationObservation, undefined);
  assert.throws(() => generateBuildSummary({ build: { cpuId: currentBuild.cpuId } }), { statusCode: 400 });
  assert.throws(() => generateBuildSummary({ build: { ...currentBuild, gpuId: 'not-a-component' } }), { statusCode: 404 });
});

test('v3: complete build with pending BIOS keeps independent analyses and shop links, but never claims verified FPS', () => {
  const build = { ...currentBuild, cpuId: 'cpu-intel-i5-12400f', motherboardId: 'mb-msi-pro-h610m-s-ddr4' };
  const result = generateBuildSummary({ ...input(), build });
  assert.equal(result.selectionStatus, 'complete');
  assert.equal(result.compatibility.status, 'compatible');
  assert.ok(!result.compatibility.unverifiedChecks.some(check => /BIOS/.test(check.code)));
  assert.ok(result.gamePerformance.estimatedFpsRange);
  assert.ok(Number.isFinite(result.gamePerformance.estimatedFps));
  assert.equal(typeof result.bottlenecks.hasBottleneck, 'boolean');
  assert.equal(result.recommendationObservation.available, true);
  assert.ok(result.recommendationObservation.unverifiedChecks);
  assert.deepEqual(result.recommendationObservation.selectionExplanation.compatibility.checks.filter(check => check.severity === 'high'), []);
  assert.ok(Object.values(getPurchaseLinksByBuild(build)).every(links => links.length > 0));
  assert.equal(result.components.motherboard.id, build.motherboardId);
});

test('v3: alternative recommendations receive the exact selected cooling and user constraints', () => {
  const payload = { ...input(), build: { ...currentBuild, coolerId: 'cooler-bequiet-pure-rock-3-black', fans: [] }, usageType: 'programming' };
  // Capture the request boundary without claiming that this cooling is compatible.
  let captured;
  const result = createBuildSummaryGenerator({ recommendation: request => {
    captured = request;
    throw Object.assign(new Error('No verified combination with this cooling'), { statusCode: 422 });
  } })(payload);
  assert.equal(captured.components.cooler, payload.build.coolerId);
  assert.equal(captured.budget.amount, payload.budget.amount);
  assert.equal(captured.usageType, 'programming');
  assert.equal(result.recommendationObservation.available, false);
  assert.equal(result.components.cooler.id, payload.build.coolerId);
});

test('v3: budgets in another currency cannot be approved against BRL prices', () => {
  const result = generateBuildSummary({ ...input(), budget: { amount: 10000, currency: 'USD' } });
  assert.equal(result.budgetStatus.status, 'unavailable');
  assert.equal(result.budgetStatus.reason, 'currency_mismatch');
  assert.equal(result.budgetStatus.remaining, null);
  assert.equal(result.recommendationObservation, undefined);
  assert.equal(result.compatibility.compatible, true);
  assert.throws(() => recommendBuildByBudget({ budget: { amount: 10000, currency: 'USD' } }), { statusCode: 400 });
  assert.throws(() => recommendBuildsByBudgetRange({ budgetRange: { min: 1000, max: 10000, currency: 'USD' } }), { statusCode: 400 });
});

test('v3: recommendations disclose the bounded budget and usage and pass all known compatibility checks', () => {
  for (const usageType of ['gaming', 'programming', 'work']) {
    const recommendation = recommendBuildByBudget({ budget: { amount: 10000, currency: 'BRL', priority: 'lowest-price' }, usageType });
    assert.equal(recommendation.usageType, usageType);
    assert.equal(recommendation.priority, 'lowest-price');
    assert.deepEqual(recommendation.requestedBudget, { amount: 10000, currency: 'BRL' });
    assert.deepEqual(checkBuildCompatibility(serializeBuildSelection(recommendation.components)).alerts, []);
    assert.ok(recommendation.totalEstimatedPrice <= recommendation.requestedBudget.amount);
    assert.equal(recommendation.remainingBudget, Number((10000 - recommendation.totalEstimatedPrice).toFixed(2)));
    assert.equal(recommendation.methodology.performance.measuredBenchmark, false);
    assert.equal(recommendation.estimatedFps, undefined);
  }
});

test('v3: replacement may preserve partial performance, but never commits when compatibility verification failed', () => {
  const selectedComponents = selectBuildComponents(currentBuild);
  const replacementBuild = { ...currentBuild, ramId: 'ram-kvr32n22d8-32' };
  const candidate = selectBuildComponents(replacementBuild).ram;
  const state = { selectedComponents, budget: input().budget, usageType: 'gaming', revision: 3, replacementHistory: [] };
  const partial = createBuildSummaryGenerator({ bottlenecks: fail })({ ...input(), build: replacementBuild });
  const next = replaceBuildComponent(state, 'ram', candidate, partial, 3);
  assert.equal(next.selectedComponents.ram.id, replacementBuild.ramId);
  assert.equal(next.summary.bottlenecks.reason, 'analysis_failed');
  assert.deepEqual(next.budget, state.budget);
  for (const slot of Object.keys(selectedComponents).filter(slot => slot !== 'ram')) assert.equal(next.selectedComponents[slot], selectedComponents[slot]);
  const unverified = createBuildSummaryGenerator({ compatibility: fail })({ ...input(), build: replacementBuild });
  const applied=replaceBuildComponent(state, 'ram', candidate, unverified, 3);
  assert.equal(applied.selectedComponents.ram.id, candidate.id);
  assert.equal(applied.summary.compatibility.available, false);
});

for (const cpuId of ['cpu-ryzen-7-7800x3d-box', 'cpu-ryzen-9-9900x-box']) {
  test(`v3: new ${cpuId} keeps the selected identity and estimates without a BIOS gate`, () => {
    const result = generateBuildSummary({ ...input(), build: {
      ...currentBuild, cpuId, motherboardId: 'mb-gigabyte-b650m-d3hp', ramId: 'ram-cmk16gx5m1b5200c40'
    } });
    assert.equal(result.selectionStatus, 'complete');
    assert.equal(result.compatibility.compatible, true);
    assert.ok(!result.compatibility.unverifiedChecks.some(check => /BIOS/.test(check.code)));
    assert.ok(result.gamePerformance.estimatedFpsRange);
    assert.equal(result.gamePerformance.estimation.measuredBenchmark, false);
    assert.equal(result.bottlenecks.available, true);
    assert.equal(result.components.cpu.id, cpuId);
    assert.equal(checkBuildCompatibility(currentBuild).compatible, true, 'Existing baseline remains unchanged');
  });
}
