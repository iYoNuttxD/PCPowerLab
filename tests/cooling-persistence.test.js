import { currentBuild, currentBuildTotal, currentPrice } from './helpers/current-build.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { components } from '../src/data/components.mock.js';
import { readyBuilds } from '../src/data/readyBuilds.js';
import { selectBuildComponents, calculateBuildPrice } from '../src/services/build.service.js';
import { generateBuildSummary } from '../src/services/buildSummaryService.js';
import { saveBuild, updateSavedBuild, clearSavedBuildsForTests } from '../src/services/savedBuildsService.js';
import { exportBuildToJson, exportSavedBuildToJson } from '../src/services/buildExportService.js';
import { createBuildShare } from '../src/services/shareBuildService.js';
import { generateBuildReport } from '../src/services/buildReportService.js';
import { compareBuilds } from '../src/services/buildComparisonService.js';
import { createSavedBuildVersion } from '../src/services/savedBuildVersionsService.js';
import { getPurchaseLinksByBuild } from '../src/services/purchaseLinksService.js';
import { createRecommendationFeedback } from '../src/services/recommendationFeedbackService.js';

const legacy = readyBuilds[0].components;
const cooler = components.find(part => part.id === 'cooler-bequiet-pure-rock-3-black');
const fan = components.find(part => part.id === 'fan-noctua-nf-a14-pwm');
const selection = () => ({ ...currentBuild, coolerId: cooler.id, fans: [{ fanId: fan.id, quantity: 2 }] });
const expectedTotal = () => Number((currentBuildTotal() + currentPrice(cooler.id) + 2 * currentPrice(fan.id)).toFixed(2));

test('optional cooling survives save, export, share, version, reload and removal', () => {
  clearSavedBuildsForTests();
  const saved = saveBuild({ name: 'Cooling build', components: selection(), totalEstimatedPrice: 0 });
  assert.equal(saved.totalEstimatedPrice, expectedTotal());
  assert.equal(saved.components.cooler, cooler.id);
  assert.deepEqual(saved.components.fans, selection().fans);
  const exported = exportSavedBuildToJson(saved.id, { includeSummary: true });
  assert.deepEqual(exported.build.components, selection());
  assert.equal(exported.summary.totalEstimatedPrice, expectedTotal());
  const loaded = selectBuildComponents(exported.build);
  assert.equal(loaded.cooler.id, cooler.id);
  assert.equal(loaded.fans[0].quantity, 2);
  const share = createBuildShare({ buildId: saved.id });
  assert.equal(share.buildSummary.componentIds.cooler, cooler.id);
  assert.deepEqual(share.buildSummary.componentIds.fans, selection().fans);
  assert.equal(share.buildSummary.totalEstimatedPrice, expectedTotal());
  const version = createSavedBuildVersion(saved.id, { buildSnapshot: saved });
  updateSavedBuild(saved.id, { components: { cooler: null, fans: [] } });
  assert.equal(selectBuildComponents({ components: saved.components }).cooler, undefined);
  assert.equal(saved.totalEstimatedPrice, currentBuildTotal());
  assert.equal(version.buildSnapshot.components.cooler, cooler.id);
  assert.deepEqual(version.buildSnapshot.components.fans, selection().fans);
});

test('summary, comparison, report and purchase links include optional components and quantity cost', () => {
  const summary = generateBuildSummary({ build: selection(), budget: { amount: 1000 } });
  assert.equal(summary.totalEstimatedPrice, expectedTotal());
  assert.equal(summary.components.fans[0].quantity, 2);
  assert.ok(['unverified', 'incompatible'].includes(summary.compatibility.status));
  assert.equal(summary.compatibility.compatible, false);
  const comparison = compareBuilds({ builds: [{ name: 'Legacy', ...legacy }, { name: 'Cooling', ...selection() }] });
  assert.equal(comparison.builds[1].totalEstimatedPrice, expectedTotal());
  assert.equal(comparison.builds[1].components.cooler.id, cooler.id);
  assert.ok(Number.isFinite(comparison.builds[1].performanceScore));
  const report = generateBuildReport({ build: selection(), includePurchaseLinks: true });
  assert.equal(report.pricing.totalEstimatedPrice, expectedTotal());
  assert.equal(report.components.fans[0].quantity, 2);
  assert.equal(report.compatibility.compatible, false);
  const links = getPurchaseLinksByBuild(selection());
  assert.equal(links.cooler.length, 5);
  assert.equal(links.fans.length, 5);
  assert.equal(links.fans[0].quantity, 2);
});

test('legacy exports stay seven-slot and new selections round-trip directly', () => {
  assert.deepEqual(exportBuildToJson({ build: legacy }).build.components, legacy);
  assert.deepEqual(exportBuildToJson({ build: selection() }).build.components, selection());
  assert.equal(Object.keys(selectBuildComponents(legacy)).length, 7);
});

test('feedback retains selected cooler and quantified fans without expanding data unnecessarily', () => {
  const feedback = createRecommendationFeedback({ recommendationType: 'general', rating: 4,
    buildSnapshot: selection(), buildDetails: selectBuildComponents(selection()) });
  assert.equal(feedback.buildSnapshot.coolerId, cooler.id);
  assert.deepEqual(feedback.buildSnapshot.fans, selection().fans);
  assert.equal(feedback.buildDetails.cooler.id, cooler.id);
  assert.equal(feedback.buildDetails.fans[0].quantity, 2);
});

test('saved builds reject wrong-category accessories and malformed quantities', () => {
  assert.throws(() => saveBuild({ name: 'Invalid', components: { ...legacy, coolerId: legacy.cpuId } }), { statusCode: 400 });
  assert.throws(() => saveBuild({ name: 'Invalid', components: { ...legacy, fans: [{ fanId: fan.id, quantity: 1.5 }] } }), { statusCode: 400 });
});


test('unknown cooling price cannot approve budget as free', () => {
  const previous = fan.price;
  try {
    fan.price = null;
    assert.throws(() => calculateBuildPrice(selectBuildComponents(selection())), { statusCode: 422 });
    const summary = generateBuildSummary({ build: selection(), budget: { amount: 5000 } });
    assert.equal(summary.totalEstimatedPrice, null);
    assert.equal(summary.budgetStatus.status, 'unavailable');
    assert.equal(summary.budgetStatus.remaining, null);
    assert.equal(summary.pricing.knownReferenceSubtotal, calculateBuildPrice(selectBuildComponents({ ...selection(), fans: [] })));
    assert.deepEqual(summary.pricing.componentsWithoutReference, [fan.id]);
    assert.ok(summary.compatibility.status);
    const saved = saveBuild({ name: 'Missing price', components: selection(), totalEstimatedPrice: 0 });
    assert.equal(saved.totalEstimatedPrice, null);
    assert.deepEqual(saved.pricing, summary.pricing);
    assert.deepEqual(saved.components.fans, selection().fans);
  } finally {
    fan.price = previous;
  }
});
