import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { components } from '../src/data/components.mock.js';
import { selectBuildComponents, calculateBuildPrice, allBuildComponents } from '../src/services/build.service.js';
import { checkBuildCompatibility } from '../src/services/compatibility.service.js';
import { generateBuildSummary } from '../src/services/buildSummaryService.js';
import { summarizeBuildPricing } from '../src/services/marketPriceService.js';
import { simulateGamePerformance } from '../src/services/gamePerformanceService.js';
import { saveBuild, updateSavedBuild } from '../src/services/savedBuildsService.js';
import { revalidateSavedBuild } from '../src/services/savedBuildRevalidationService.js';
import { generateBuildReport } from '../src/services/buildReportService.js';
import { exportSavedBuildToJson } from '../src/services/buildExportService.js';
import { createBuildShare } from '../src/services/shareBuildService.js';
import { calculateBuildScore } from '../src/services/buildScoreService.js';
import { compareBuilds } from '../src/services/buildComparisonService.js';
import { suggestUpgrades } from '../src/services/upgradeSuggestionService.js';
import { generateUpgradeRoadmap } from '../src/services/upgradeRoadmapService.js';
import { recommendBuildByBudget, recommendBuildsByBudgetRange } from '../src/services/recommendationService.js';

const pricedBuild = {
  cpuId: 'cpu-ryzen-5-5600', motherboardId: 'mb-b550m-aorus-elite', gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4', storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w', caseId: 'case-mid-tower-airflow'
};
const build = { ...pricedBuild, storageId: 'ssd-samsung-970-evo-plus-1tb' };
const simulation = { build, gameId: 'game-valorant', targetResolution: '1080p', qualityPreset: 'high' };
const knownSubtotal = () => Number(allBuildComponents(selectBuildComponents(build))
  .filter(part => typeof part.price === 'number' && Number.isFinite(part.price) && part.price > 0)
  .reduce((sum, part) => sum + part.price, 0).toFixed(2));

function assertUnavailablePricing(pricing) {
  assert.equal(pricing.estimatedTotal, null);
  assert.equal(pricing.knownReferenceSubtotal, knownSubtotal());
  assert.equal(pricing.referenceTotalComplete, false);
  assert.deepEqual(pricing.componentsWithoutReference, [build.storageId]);
}

test('an unpriced selected component keeps hardware analysis and simulations usable', () => {
  const selected = selectBuildComponents(build);
  assert.equal(selected.storage.price, null);
  assert.throws(() => calculateBuildPrice(selected), { statusCode: 422 });
  const compatibility = checkBuildCompatibility(build);
  assert.equal(compatibility.compatible, true);
  assert.equal(compatibility.estimatedPrice, null);
  assertUnavailablePricing(compatibility.pricing);
  const summary = generateBuildSummary(simulation);
  assert.equal(summary.totalEstimatedPrice, null);
  assertUnavailablePricing(summary.pricing);
  assert.equal(summary.compatibility.status, 'compatible');
  assert.ok(summary.gamePerformance.estimatedFps > 0);
  assert.ok(simulateGamePerformance(simulation).estimatedFps > 0);
});

test('missing references never turn a partial subtotal into a full total or budget approval', () => {
  const summary = generateBuildSummary({ build, budget: { amount: 1000 } });
  assert.equal(summary.totalEstimatedPrice, null);
  assert.equal(summary.budgetStatus.totalEstimatedPrice, null);
  assert.equal(summary.budgetStatus.remaining, null);
  assert.equal(summary.budgetStatus.status, 'unavailable');
  assert.equal(summary.budgetStatus.knownReferenceSubtotal, knownSubtotal());
  assert.match(summary.summary, /orçamento não foi verificado/);
  assert.match(summary.finalRecommendation, /preços pendentes/);
  const fans = summarizeBuildPricing({
    cpu: { id: 'test-priced', price: 25 },
    fans: [{ id: 'test-fan-known', price: 10, quantity: 3 }, { id: 'test-fan-missing', price: null, quantity: 2 }]
  });
  assert.equal(fans.estimatedTotal, null);
  assert.equal(fans.knownReferenceSubtotal, 55);
  assert.equal(fans.unavailableReferenceUnits, 2);
  assert.deepEqual(fans.componentsWithoutReference, ['test-fan-missing']);
});

test('save, update, revalidate, export, share and report preserve unpriced builds and coverage', () => {
  const saved = saveBuild({ name: 'Unpriced reference round-trip', components: build, totalEstimatedPrice: 1 });
  assert.equal(saved.totalEstimatedPrice, null);
  assertUnavailablePricing(saved.pricing);
  assert.equal(revalidateSavedBuild(saved.id).results[0].status, 'compatible');
  assert.equal(updateSavedBuild(saved.id, { name: 'Renamed', totalEstimatedPrice: 1 }).totalEstimatedPrice, null);
  const exported = exportSavedBuildToJson(saved.id, { includeSummary: true });
  assert.equal(exported.summary.totalEstimatedPrice, null);
  assertUnavailablePricing(exported.summary.pricing);
  assert.equal(exported.build.components.storageId, build.storageId);
  const shared = createBuildShare({ buildId: saved.id });
  assert.equal(shared.buildSummary.totalEstimatedPrice, null);
  assertUnavailablePricing(shared.buildSummary.pricing);
  const report = generateBuildReport({ build, gameIds: ['game-valorant'] });
  assert.equal(report.pricing.totalEstimatedPrice, null);
  assertUnavailablePricing(report.pricing);
  assert.equal(report.compatibility.compatible, true);
  assert.ok(report.gamePerformance[0].estimatedFps > 0);
  updateSavedBuild(saved.id, { components: { storage: pricedBuild.storageId } });
  assert.equal(saved.totalEstimatedPrice, calculateBuildPrice(selectBuildComponents(pricedBuild)));
  assert.equal(saved.pricing.referenceTotalComplete, true);
  assert.deepEqual(saved.pricing.componentsWithoutReference, []);
});

test('cost-dependent scores stay unavailable while technical comparisons still work', () => {
  const score = calculateBuildScore({ build });
  assert.equal(score.available, false);
  assert.equal(score.overallScore, null);
  assert.equal(score.criteria.costBenefitScore, null);
  assert.ok(score.criteria.performanceScore > 0);
  assert.equal(score.criteria.compatibilityScore, 100);
  const comparison = compareBuilds({ builds: [{ name: 'Missing', ...build }, { name: 'Priced', ...pricedBuild }] });
  assert.equal(comparison.builds[0].comparisonScore, null);
  assert.equal(comparison.builds[0].costBenefitScore, null);
  assert.equal(comparison.recommendedBuild.name, 'Priced');
  const unavailable = compareBuilds({ builds: [build, build], comparisonCriteria: 'budget' });
  assert.equal(unavailable.recommendedBuild.available, false);
  const performance = compareBuilds({ builds: [build, build], comparisonCriteria: 'performance' });
  assert.ok(performance.builds.every(entry => Number.isFinite(entry.comparisonScore)));
});

test('priced upgrades remain available even when the current build has no complete cost', () => {
  const upgrades = suggestUpgrades({ build, budget: { amount: 3000 } });
  assert.equal(upgrades.currentBuildSummary.totalEstimatedPrice, null);
  assertUnavailablePricing(upgrades.currentBuildSummary.pricing);
  assert.ok(upgrades.suggestions.length > 0);
  assert.ok(upgrades.suggestions.every(entry => entry.estimatedUpgradeCost > 0 && entry.suggestedComponent.price > 0));
  const roadmap = generateUpgradeRoadmap({ build, totalBudget: 3000 });
  assert.equal(roadmap.currentBuildSummary.totalEstimatedPrice, null);
  assert.equal(roadmap.initialCompatibility.estimatedPrice, null);
  assert.ok(roadmap.steps.length > 0);
  assert.ok(roadmap.totalEstimatedCost > 0);
});

test('recommendations use priced alternatives and human summaries use Portuguese levels', () => {
  const result = recommendBuildByBudget({ budget: { amount: 6000 }, usageType: 'gaming' });
  assert.ok(allBuildComponents(result.components).every(part => Number.isFinite(part.price) && part.price > 0));
  assert.equal(result.totalEstimatedPrice, calculateBuildPrice(result.components));
  const range = recommendBuildsByBudgetRange({ budgetRange: { min: 1500, max: 6000 }, usageType: 'gaming' });
  assert.ok(range.length > 0);
  for (const entry of range) {
    assert.doesNotMatch(entry.summary, /\b(?:good|excellent|basic|entry)\b/);
    assert.match(entry.summary, /desempenho estimado (bom|excelente|básico|de entrada)/);
    assert.match(entry.summary, /gargalos/);
    assert.equal(entry.totalEstimatedPrice, calculateBuildPrice(entry.components));
  }
});

test('an unavailable price category or selected accessory gives a controlled pricing result', () => {
  const storageParts = components.filter(part => part.category === 'storage');
  const prices = storageParts.map(part => part.price);
  try {
    for (const part of storageParts) part.price = null;
    assert.throws(() => recommendBuildByBudget({ budget: { amount: 10000 } }), error => {
      assert.equal(error.statusCode, 422);
      assert.match(error.errors.join(' '), /preço de referência válido.*storage/);
      return true;
    });
  } finally { storageParts.forEach((part, index) => { part.price = prices[index]; }); }
  assert.throws(() => recommendBuildByBudget({ budget: { amount: 10000 }, coolerId: 'cooler-noctua-nh-u12s-redux' }), { statusCode: 422 });
});

test('HTTP requests serialize explicit null totals while retaining compatibility, FPS and saving', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  async function post(path, body, status = 200) {
    const response = await globalThis.fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json();
    assert.equal(response.status, status, JSON.stringify(payload));
    assert.equal(payload.success, true);
    return payload.data;
  }
  const compatibility = await post('/compatibility/check', build);
  assert.equal(compatibility.compatible, true);
  assert.equal(compatibility.estimatedPrice, null);
  const summary = await post('/build-summary', simulation);
  assert.equal(summary.totalEstimatedPrice, null);
  assertUnavailablePricing(summary.pricing);
  assert.ok(summary.gamePerformance.estimatedFps > 0);
  assert.ok((await post('/performance/simulate-game', simulation)).estimatedFps > 0);
  const saved = await post('/saved-builds', { name: 'Unpriced HTTP', components: build, totalEstimatedPrice: 0 }, 201);
  assert.equal(saved.totalEstimatedPrice, null);
  assertUnavailablePricing(saved.pricing);
});
