import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { components } from '../src/data/components.mock.js';
import { catalogV3 } from '../src/data/catalog.v3.js';
import { componentImageIdentity } from '../src/data/component-images.js';
import { attachVerifiedMotherboardFeatures } from '../src/data/motherboard-features.v3.js';
import { updateComponentRecord } from '../src/data/component.repository.js';
import { getDatedReference } from '../src/data/dated-price-references.js';
import { performanceParameters } from '../src/data/performanceParameters.js';
import { generateBuildSummary } from '../src/services/buildSummaryService.js';
import { calculateBuildScore } from '../src/services/buildScoreService.js';
import { recommendBuildByBudget } from '../src/services/recommendationService.js';
import { checkBuildCompatibility } from '../src/services/compatibility.service.js';
import { getPurchaseLinksByComponentId } from '../src/services/purchaseLinksService.js';
import { currentBuild } from './helpers/current-build.js';

const byId = id => components.find(c => c.id === id);
const newBuild = { ...currentBuild, cpuId: 'cpu-ryzen-9-9900x-box', gpuId: 'gpu-msi-rtx-5060-ventus-2x-oc-8g', motherboardId: 'mb-gigabyte-b650m-d3hp', ramId: 'ram-cmh64gx5m2b6000z30w' };
const payload = { build: newBuild, usageType: 'gaming', budget: { amount: 20000, currency: 'BRL' }, gameId: 'game-cyberpunk-2077', targetResolution: '1080p', qualityPreset: 'high' };

test('V3 adds seven priced photographed choices across real budget/use gaps, not obsolete candidates', () => {
  assert.equal(catalogV3.length, 7);
  assert.deepEqual(Object.fromEntries(['cpu', 'gpu', 'case'].map(category => [category, catalogV3.filter(c => c.category === category).length])), { cpu: 2, gpu: 3, case: 2 });
  assert.equal(components.filter(c => c.active !== false).length, 93);
  assert.equal(components.filter(c => c.active === false).length, 79);
  for (const entry of catalogV3) {
    const c = byId(entry.id), reference = getDatedReference(c);
    assert.equal(c.active, true);
    assert.equal(c.priceKind, 'dated-reference-snapshot');
    assert.ok(reference.price > 0);
    assert.equal(reference.queriedAt, '2026-10-20');
    assert.equal(reference.verificationMethod, 'rendered_product_page');
    assert.equal(c.image.status, 'verified');
    assert.equal(c.image.productIdentity, componentImageIdentity(c));
    assert.equal(c.specVerifiedAt, '2026-10-20');
    assert.ok(c.specSourceUrl.startsWith('https://'));
  }
  assert.equal(byId('cpu-ryzen-9-9900x-box').image.identityLevel, 'model-family');
  assert.match(byId('cpu-ryzen-9-9900x-box').image.identityNotes, /9950x/);
  assert.equal(byId('cpu-ryzen-9-7900-box'), undefined);
});

test('V3 manufacturer facts distinguish real use, dimensions, cooling and memory variants', () => {
  assert.deepEqual(['cores', 'threads', 'tdpWatts', 'l3CacheMb'].map(k => byId('cpu-ryzen-7-7800x3d-box').specs[k]), [8, 16, 120, 96]);
  assert.deepEqual(['cores', 'threads', 'baseClockGhz', 'boostClockGhz'].map(k => byId('cpu-ryzen-9-9900x-box').specs[k]), [12, 24, 4.4, 5.6]);
  assert.deepEqual(['vramGb', 'lengthMm', 'tdpWatts', 'recommendedPsuWatts'].map(k => byId('gpu-msi-rtx-5060-ti-ventus-2x-oc-plus-16g').specs[k]), [16, 227, 180, 600]);
  assert.deepEqual(['vramGb', 'lengthMm', 'tdpWatts', 'recommendedPsuWatts'].map(k => byId('gpu-msi-rtx-5060-ventus-2x-oc-8g').specs[k]), [8, 197, 145, 550]);
  const arc = byId('gpu-asrock-arc-a380-challenger-itx-6g-oc').specs;
  assert.deepEqual([arc.vramGb, arc.memoryBusBits, arc.lengthMm, arc.recommendedPsuWatts], [6, 96, 190, 500]);
  assert.deepEqual(arc.powerConnectors, [{ type: 'pcie-8pin', count: 1 }]);
  assert.equal(arc.hardwareAv1Encode, true);
  assert.equal(arc.requiresResizableBar, true);
  assert.equal(arc.requiresUefiBoot, true);
  assert.equal(arc.tdpWatts, null, 'Do not substitute reference-chip TDP for exact OC board evidence');
  const compact = byId('case-deepcool-cc310-black').specs, tower = byId('case-cougar-mx230-rgb-black').specs;
  assert.deepEqual(compact.supportedFormFactors, ['mATX', 'ITX']);
  assert.deepEqual(compact.radiatorSizesMm, []);
  assert.equal(compact.maxGpuLengthMm, 280);
  assert.equal(compact.maxCoolerHeightMm, 160);
  assert.equal(compact.includedFanCount, 1);
  assert.equal(tower.maxGpuLengthMm, 400);
  assert.equal(tower.maxCoolerHeightMm, 170);
  assert.equal(tower.includedFanCount, 4);
  assert.equal(tower.includedFanPwm, null);
  assert.equal(tower.supportedPsuFormFactors, null);
  assert.deepEqual(tower.radiatorSizesMm, [120, 240, 360]);
  assert.equal(tower.radiatorSizesMm.includes(280), false);
});

test('six motherboard comparisons have exact identity evidence and consistent capacity, without fabricated Flashback', () => {
  const boards = components.filter(c => c.active !== false && c.category === 'motherboard');
  assert.equal(boards.length, 6);
  for (const board of boards) {
    assert.equal(board.verifiedFeatures.catalogIdentity, componentImageIdentity(board));
    assert.equal(board.verifiedFeatures.fields.maxMemoryGb, board.specs.maxMemoryGb);
    assert.equal(board.verifiedFeatures.fields.memorySlots, board.specs.memorySlots);
    assert.equal(board.verifiedFeatures.fields.m2Slots, board.specs.m2Slots);
    assert.ok(board.verifiedFeatures.sourceUrls.length > 0);
    const changed = { ...board, name: `${board.name} other` };
    delete changed.verifiedFeatures;
    assert.equal(attachVerifiedMotherboardFeatures(changed).verifiedFeatures, undefined);
  }
  const h610 = byId('mb-msi-pro-h610m-s-ddr4').verifiedFeatures.fields;
  assert.deepEqual([h610.m2Slots, h610.sataPorts, h610.ethernetGbps, h610.wifi, h610.flashback], [1, 2, 1, false, null]);
  const b650 = byId('mb-gigabyte-b650-gaming-x-ax-v2').verifiedFeatures.fields;
  assert.deepEqual([b650.m2Slots, b650.ethernetGbps, b650.wifi, b650.frontUsbCDataRateGbps], [3, 2.5, 'Wi-Fi 6E', 20]);
  assert.equal(byId('mb-asus-tuf-z790-plus-wifi-ddr5').verifiedFeatures.fields.flashback, null);
});

test('admin identity changes invalidate motherboard comparison evidence too', () => {
  const id = 'mb-asus-tuf-b550m-plus', index = components.findIndex(c => c.id === id), original = globalThis.structuredClone(components[index]);
  try {
    updateComponentRecord(id, { name: 'Unverified new motherboard' });
    assert.equal(byId(id).verifiedFeatures, undefined);
    assert.equal(byId(id).price, null);
    assert.equal(byId(id).image.status, 'blocked');
  } finally { components[index] = original; }
});

test('new CPU/GPU selections preserve totals and shop research while BIOS and performance remain unverified', () => {
  for (const c of catalogV3.filter(c => ['cpu', 'gpu'].includes(c.category))) {
    assert.equal(c.performanceModelStatus, 'unavailable');
    assert.equal(performanceParameters.find(p => p.componentId === c.id), undefined);
    assert.equal(getPurchaseLinksByComponentId(c.id).length, 5);
  }
  const summary = generateBuildSummary(payload);
  assert.equal(summary.selectionStatus, 'complete');
  assert.equal(summary.totalEstimatedPrice, 18469.84);
  assert.equal(summary.pricing.referenceTotalComplete, true);
  assert.equal(summary.pricing.availableMarketQuotesTotal, null);
  assert.equal(summary.budgetStatus.status, 'within_budget');
  assert.equal(summary.bottlenecks.reason, 'performance_model_unavailable');
  assert.deepEqual(summary.bottlenecks.componentsWithoutPerformanceModel.sort(), [newBuild.cpuId, newBuild.gpuId].sort());
  assert.ok(summary.compatibility.unverifiedChecks.some(check => check.code === 'CPU_BIOS_UNVERIFIED'));
  assert.equal(summary.compatibility.compatible, false);
  assert.equal(summary.gamePerformance.available, false);
  assert.equal(Number.isFinite(summary.gamePerformance.estimatedFps), false);
  assert.equal(calculateBuildScore(payload).overallScore, null);
  const recommendation = recommendBuildByBudget({ budget: { amount: 20000, currency: 'BRL' }, usageType: 'gaming' });
  assert.equal(catalogV3.some(c => ['cpu', 'gpu'].includes(c.category) && [recommendation.components.cpu.id, recommendation.components.gpu.id].includes(c.id)), false);
});

test('new cases never convert unsupported AIO or unknown PSU format into compatible', () => {
  const aio = components.find(c => c.active !== false && c.category === 'cooler' && c.specs.coolingType === 'aio');
  assert.ok(aio);
  const compact = checkBuildCompatibility({ ...currentBuild, caseId: 'case-deepcool-cc310-black', coolerId: aio.id });
  assert.ok(compact.alerts.some(alert => /RADIATOR/.test(alert.code)));
  const unknown = checkBuildCompatibility({ ...currentBuild, caseId: 'case-cougar-mx230-rgb-black' });
  assert.ok(unknown.unverifiedChecks.some(check => check.code === 'CASE_PSU_FORM_FACTOR_UNVERIFIED'));
  assert.equal(unknown.compatible, false);
});


test('all 81 pre-V3 active identities, photographs and historical prices remain unchanged', () => {
  const baseline = JSON.parse(readFileSync(new globalThis.URL('./fixtures/pre-v3-active-identities.json', import.meta.url), 'utf8'));
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(baseline.count, 81);
  assert.equal(baseline.components.length, 81);
  assert.equal(new Set(baseline.components.map(entry => entry.id)).size, 81);
  for (const original of baseline.components) {
    const component = byId(original.id);
    assert.ok(component && component.active !== false, original.id);
    assert.equal(componentImageIdentity(component), original.identity, `${original.id}: identity`);
    assert.equal(component.price, original.price, `${original.id}: price`);
    assert.equal(hash(component.image), original.imageHash, `${original.id}: image metadata`);
    assert.equal(hash(getDatedReference(component)), original.priceObservationHash, `${original.id}: price observation`);
  }
});

for (const usageType of ['study', 'gaming', 'work']) {
  for (const [amount, expectedTotal, storageId] of [
    [4500, 4339.84, 'ssd-kingston-a400-240gb'],
    [5000, 4589.75, 'ssd-kingston-nv3-500gb']
  ]) test(`real entry recommendation works for ${usageType} at BRL ${amount} without relaxing unknowns`, () => {
    const result = recommendBuildByBudget({ budget: { amount, currency: 'BRL' }, usageType });
    assert.equal(result.totalEstimatedPrice, Number((expectedTotal + (usageType === 'study' ? 0 : 90.09)).toFixed(2)));
    assert.ok(result.components.ram.specs.capacityGb >= (usageType === 'study' ? 8 : 16));
    assert.equal(result.components.gpu.id, 'gpu-msi-rtx-3050-lp-6g-oc');
    assert.equal(result.components.case.id, 'case-deepcool-cc310-black');
    assert.equal(result.components.storage.id, storageId);
    assert.equal(result.compatibilityStatus, 'compatible');
    assert.deepEqual(result.unverifiedChecks, []);
    const build = Object.fromEntries(Object.entries(result.components).map(([slot, component]) => [`${slot}Id`, component.id]));
    const compatibility = checkBuildCompatibility(build);
    assert.equal(compatibility.compatible, true);
    assert.deepEqual(compatibility.unverifiedChecks, []);
    assert.ok(compatibility.verificationSources.some(source => source.componentId === result.components.gpu.id));
    assert.equal(compatibility.coolingAssessment.status, 'unverified', 'No cooler fit or thermal outcome is fabricated by this seven-slot recommendation');
    const gameSummary = generateBuildSummary({ build, usageType, gameId: 'game-valorant' });
    assert.equal(gameSummary.gamePerformance.estimatedFps, null, 'Verified physical fit does not invent game calibration for the score-only 3050');
    assert.equal(gameSummary.gamePerformance.available, false);
    for (const component of Object.values(result.components)) {
      assert.notEqual(component.active, false);
      assert.ok(getDatedReference(byId(component.id)).price > 0);
    }
  });
  test(`sub-entry ${usageType} budget fails honestly rather than fabricating a cheaper seven-slot build`, () => {
    for (const amount of [3000, 4000]) assert.throws(() => recommendBuildByBudget({ budget: { amount }, usageType }), error => error.statusCode === 422);
  });
  test(`midrange and larger ${usageType} budgets still return complete compatible selections`, () => {
    for (const amount of [7000, 10000, 15000]) {
      const result = recommendBuildByBudget({ budget: { amount }, usageType });
      assert.equal(Object.keys(result.components).length, 7);
      assert.ok(result.totalEstimatedPrice <= amount);
      assert.equal(result.compatibilityStatus, 'compatible');
      assert.deepEqual(result.unverifiedChecks, []);
      assert.equal(catalogV3.some(component => ['cpu', 'gpu'].includes(component.category) && Object.values(result.components).some(selected => selected.id === component.id)), false, 'Technical specifications alone do not invent a performance ranking');
    }
  });
}


for (const usageType of ['study', 'gaming', 'work']) test(`premium ${usageType} budget respects explicit performance versus price priority`, () => {
  const cheapest = recommendBuildByBudget({ budget: { amount: 15000, priority: 'lowest-price' }, usageType });
  const performance = recommendBuildByBudget({ budget: { amount: 15000, priority: 'performance' }, usageType });
  assert.equal(cheapest.totalEstimatedPrice, usageType === 'study' ? 4339.84 : 4429.93);
  assert.ok(performance.totalEstimatedPrice > cheapest.totalEstimatedPrice);
  assert.ok(performance.totalEstimatedPrice <= 15000);
  assert.equal(performance.compatibilityStatus, 'compatible');
  assert.deepEqual(performance.unverifiedChecks, []);
  assert.equal(performance.components.ram.specs.capacityGb, 64);
  assert.equal(performance.performanceBasis, 'simulated', 'Higher budget does not turn internal scores into measured results');
});
