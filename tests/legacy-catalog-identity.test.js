import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { components } from '../src/data/components.mock.js';
import { findComponentRecordById, listComponentRecords, resolveComponentRecordById } from '../src/data/component.repository.js';
import { findComponentById, listComponents } from '../src/services/component.service.js';
import { selectBuildComponents, serializeBuildSelection } from '../src/services/build.service.js';
import { generateBuildSummary } from '../src/services/buildSummaryService.js';
import { calculateBuildScore } from '../src/services/buildScoreService.js';
import { generateBuildReport } from '../src/services/buildReportService.js';
import { saveBuild, getSavedBuildById, updateSavedBuild, deleteSavedBuild } from '../src/services/savedBuildsService.js';
import { createSavedBuildVersion, getSavedBuildVersionById } from '../src/services/savedBuildVersionsService.js';
import { exportBuildToJson, exportSavedBuildToJson } from '../src/services/buildExportService.js';
import { createBuildShare, getSharedBuildById } from '../src/services/shareBuildService.js';
import { revalidateSavedBuild } from '../src/services/savedBuildRevalidationService.js';
import { getPurchaseLinksByComponentId } from '../src/services/purchaseLinksService.js';

const build = {
  cpuId: 'cpu-ryzen-5-5600', motherboardId: 'mb-b550m-aorus-elite', gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4', storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w', caseId: 'case-mid-tower-airflow'
};
const simulation = { gameId: 'game-valorant', targetResolution: '1080p', qualityPreset: 'high' };
const raw = id => components.find(component => component.id === id);

function fixture(t, sourceId, id, fields = {}) {
  const record = { ...globalThis.structuredClone(raw(sourceId)), id, active: true, lifecycle: 'active', replacementId: null, ...fields };
  components.push(record);
  t.after(() => components.splice(components.indexOf(record), 1));
  return record;
}

function retire(t, id, replacementId = null) {
  const record = raw(id);
  const previous = globalThis.structuredClone(record);
  Object.assign(record, { active: false, lifecycle: 'legacy', replacementId });
  t.after(() => {
    for (const key of Object.keys(record)) delete record[key];
    Object.assign(record, previous);
  });
  return record;
}

function saveForTest(t, input) {
  const saved = saveBuild(input);
  t.after(() => deleteSavedBuild(saved.id));
  return saved;
}

test('legacy IDs are explicitly resolvable without exposing ordinary admin-deactivated records', t => {
  const replacement = fixture(t, build.storageId, 'legacy-test-active-storage');
  const legacy = fixture(t, build.storageId, 'legacy-test-old-storage', {
    active: false, lifecycle: 'legacy', replacementId: replacement.id, price: null
  });
  const inactive = fixture(t, build.storageId, 'legacy-test-admin-disabled', { active: false });
  assert.equal(findComponentRecordById(legacy.id), null);
  assert.strictEqual(resolveComponentRecordById(legacy.id), legacy);
  assert.strictEqual(findComponentRecordById(inactive.id, { includeInactive: true }), inactive);
  assert.equal(resolveComponentRecordById(inactive.id), null);
  assert.equal(findComponentById(inactive.id), null);
  assert.equal(resolveComponentRecordById('missing-legacy-id'), null);
  assert.ok(!listComponentRecords().some(part => part.id === legacy.id));
  assert.ok(!listComponents().some(part => part.id === legacy.id));
  const expanded = listComponents({ type: 'storage', includeLegacy: true });
  assert.ok(expanded.some(part => part.id === legacy.id));
  assert.ok(expanded.every(part => part.category === 'storage'));
  assert.ok(!expanded.some(part => part.id === inactive.id));
  assert.ok(!listComponents({ includeLegacy: 'true' }).some(part => part.id === legacy.id));
  // A stale active flag must not make a retired model a new-catalog choice.
  legacy.active = true;
  assert.ok(!listComponents().some(part => part.id === legacy.id));
  assert.equal(findComponentById(legacy.id).selectable, false);
});

test('replacement metadata is a same-category suggestion and cannot replace identity, specs or price', t => {
  const replacement = fixture(t, build.storageId, 'legacy-test-priced-successor', { price: 999.99 });
  const legacy = fixture(t, build.storageId, 'legacy-test-unpriced-original', {
    name: 'Original discontinued SSD', active: false, lifecycle: 'legacy', replacementId: replacement.id, price: null
  });
  const found = findComponentById(legacy.id);
  assert.equal(found.id, legacy.id);
  assert.equal(found.name, legacy.name);
  assert.deepEqual(found.specs, legacy.specs);
  assert.equal(found.catalogStatus, 'legacy');
  assert.equal(found.selectable, false);
  assert.equal(found.price, null);
  assert.equal(found.pricing.price, null);
  assert.equal(found.pricing.productId, legacy.id);
  assert.equal(found.pricing.isMarketQuote, false);
  assert.deepEqual(found.replacement, {
    id: replacement.id, name: replacement.name, category: replacement.category, requiresSelection: true
  });
  assert.equal(findComponentById(replacement.id).selectable, true);
  assert.equal(findComponentById(replacement.id).catalogStatus, 'active');
  assert.equal(findComponentById(replacement.id).replacement, null);
  for (const replacementId of [null, legacy.id, 'missing-replacement', build.cpuId]) {
    legacy.replacementId = replacementId;
    assert.equal(findComponentById(legacy.id).id, legacy.id);
    assert.equal(findComponentById(legacy.id).replacement, null);
  }
  legacy.replacementId = replacement.id;
  replacement.active = false;
  assert.equal(findComponentById(legacy.id).replacement, null);
  replacement.lifecycle = 'legacy';
  replacement.active = true;
  assert.equal(findComponentById(legacy.id).replacement, null);
});

test('retirement preserves saved builds, versions, imports, shares and technical results until explicit replacement', t => {
  const successor = fixture(t, 'cpu-intel-i5-12400f', 'legacy-test-new-cpu');
  const saved = saveForTest(t, { name: 'Original build before retirement', components: build });
  const before = generateBuildSummary({ build, ...simulation });
  const beforeScore = calculateBuildScore({ build });
  const beforeIds = globalThis.structuredClone(saved.components);
  const version = createSavedBuildVersion(saved.id, { buildSnapshot: saved, reason: 'Before retirement' });
  const earlierShare = createBuildShare({ buildId: saved.id });
  const earlierShareSnapshot = globalThis.structuredClone(earlierShare);
  const oldSpecs = globalThis.structuredClone(raw(build.cpuId).specs);
  const oldPrice = raw(build.cpuId).price;
  retire(t, build.cpuId, successor.id);

  const selected = selectBuildComponents(build);
  assert.equal(selected.cpu.id, build.cpuId);
  assert.deepEqual(selected.cpu.specs, oldSpecs);
  assert.equal(selected.cpu.price, oldPrice);
  assert.deepEqual(serializeBuildSelection(selected), beforeIds);
  const after = generateBuildSummary({ build, ...simulation });
  assert.deepEqual(after.compatibility, before.compatibility);
  assert.deepEqual(after.bottlenecks, before.bottlenecks);
  assert.deepEqual(after.gamePerformance, before.gamePerformance);
  assert.equal(after.totalEstimatedPrice, before.totalEstimatedPrice);
  assert.deepEqual(calculateBuildScore({ build }), beforeScore);
  assert.deepEqual(getSavedBuildById(saved.id).components, beforeIds);
  assert.deepEqual(updateSavedBuild(saved.id, { name: 'Renamed retired build' }).components, beforeIds);
  const revalidation = revalidateSavedBuild(saved.id);
  assert.equal(revalidation.results[0].status, 'compatible');
  assert.equal(revalidation.notificationsCreated, 0);

  const exported = exportSavedBuildToJson(saved.id, { includeSummary: true });
  assert.deepEqual(exported.build.components, build);
  assert.equal(exported.summary.compatibilityStatus, 'compatible');
  assert.equal(exported.warnings, undefined);
  assert.deepEqual(exportBuildToJson({ build }).build.components, build);
  const imported = saveForTest(t, { name: 'Imported original build', components: exported.build.components });
  assert.deepEqual(imported.components, beforeIds);
  const shared = createBuildShare({ buildId: saved.id });
  assert.deepEqual(shared.buildSummary.componentIds, beforeIds);
  assert.equal(shared.buildSummary.components.cpu.id, build.cpuId);
  assert.equal(shared.buildSummary.components.cpu.catalogStatus, 'legacy');
  assert.deepEqual(getSharedBuildById(earlierShare.shareId), earlierShareSnapshot);
  const report = generateBuildReport({ build, gameIds: [simulation.gameId], ...simulation });
  assert.equal(report.components.cpu.id, build.cpuId);
  assert.deepEqual(report.compatibility, before.compatibility);
  assert.equal(report.gamePerformance[0].estimatedFps, before.gamePerformance.estimatedFps);

  // A deliberate choice applies the new identity and exposes its real socket conflict.
  updateSavedBuild(saved.id, { components: { cpu: successor.id } });
  assert.equal(saved.components.cpu, successor.id);
  assert.equal(generateBuildSummary({ build: { components: saved.components } }).compatibility.compatible, false);
  assert.equal(getSavedBuildVersionById(saved.id, version.id).buildSnapshot.components.cpu, build.cpuId);
  assert.equal(getSharedBuildById(shared.shareId).buildSummary.componentIds.cpu, build.cpuId);
  assert.equal(imported.components.cpu, build.cpuId);
});

test('an unpriced legacy model never borrows its successor price or disables technical analysis', t => {
  const oldId = 'ssd-samsung-970-evo-plus-1tb';
  const successor = fixture(t, build.storageId, 'legacy-test-priced-ssd', { price: 999.99 });
  const legacyBuild = { ...build, storageId: oldId };
  const before = generateBuildSummary({ build: legacyBuild, ...simulation });
  assert.equal(raw(oldId).price, null);
  retire(t, oldId, successor.id);
  const summary = generateBuildSummary({ build: legacyBuild, ...simulation, budget: { amount: 100000 } });
  assert.equal(summary.totalEstimatedPrice, null);
  assert.equal(summary.pricing.referenceTotalComplete, false);
  assert.ok(summary.pricing.componentsWithoutReference.includes(oldId));
  assert.equal(summary.pricing.availableMarketQuotesTotal, null);
  assert.equal(summary.budgetStatus.status, 'unavailable');
  assert.deepEqual(summary.compatibility, before.compatibility);
  assert.equal(summary.gamePerformance.estimatedFps, before.gamePerformance.estimatedFps);
  assert.ok(summary.gamePerformance.estimatedFps > 0);
  const score = calculateBuildScore({ build: legacyBuild });
  assert.equal(score.overallScore, null);
  assert.equal(score.criteria.costBenefitScore, null);
  assert.ok(score.criteria.performanceScore > 0);
  const saved = saveForTest(t, { name: 'Legacy without quote', components: legacyBuild });
  assert.equal(saved.totalEstimatedPrice, null);
  assert.equal(exportSavedBuildToJson(saved.id, { includeSummary: true }).summary.totalEstimatedPrice, null);
  assert.equal(createBuildShare({ buildId: saved.id }).buildSummary.totalEstimatedPrice, null);
  const report = generateBuildReport({ build: legacyBuild, gameIds: [simulation.gameId] });
  assert.equal(report.pricing.totalEstimatedPrice, null);
  assert.equal(report.components.storage.id, oldId);
  assert.ok(report.gamePerformance[0].estimatedFps > 0);
  const links = getPurchaseLinksByComponentId(oldId);
  assert.ok(links.every(link => link.componentId === oldId && link.kind !== 'offer'));
  assert.ok(links.every(link => link.referencePricing.price === null));
});

test('legacy optional coolers and quantified fan packs round-trip with their original IDs', t => {
  const coolingBuild = { ...build, coolerId: 'cooler-deepcool-ak620', fans: [{ fanId: 'fan-noctua-nf-a14-pwm', quantity: 2 }] };
  const saved = saveForTest(t, { name: 'Original accessories', components: coolingBuild });
  const before = generateBuildSummary({ build: coolingBuild });
  const version = createSavedBuildVersion(saved.id, { buildSnapshot: saved });
  retire(t, coolingBuild.coolerId);
  retire(t, coolingBuild.fans[0].fanId);
  const selected = selectBuildComponents(coolingBuild);
  assert.equal(selected.cooler.id, coolingBuild.coolerId);
  assert.equal(selected.fans[0].id, coolingBuild.fans[0].fanId);
  assert.equal(selected.fans[0].quantity, 2);
  const after = generateBuildSummary({ build: coolingBuild });
  assert.equal(after.totalEstimatedPrice, before.totalEstimatedPrice);
  assert.deepEqual(after.compatibility, before.compatibility);
  assert.deepEqual(exportSavedBuildToJson(saved.id, { includeSummary: true }).build.components, coolingBuild);
  assert.deepEqual(createBuildShare({ buildId: saved.id }).buildSummary.componentIds, saved.components);
  assert.deepEqual(getSavedBuildVersionById(saved.id, version.id).buildSnapshot.components, saved.components);
  assert.equal(revalidateSavedBuild(saved.id).results[0].status, before.compatibility.status);
});

test('HTTP catalog is active-only by default and explicitly includes legacy identities without admin-disabled records', async t => {
  const legacy = fixture(t, build.storageId, 'legacy-test-http-original', { active: false, lifecycle: 'legacy', price: null });
  const inactive = fixture(t, build.storageId, 'legacy-test-http-admin-disabled', { active: false });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/v1/components`;
  async function get(path = '', expectedStatus = 200) {
    const response = await globalThis.fetch(`${base}${path}`);
    assert.equal(response.status, expectedStatus);
    return (await response.json()).data;
  }
  for (const suffix of ['', '?includeLegacy=false', '?includeLegacy=1']) {
    const catalog = await get(suffix);
    assert.ok(catalog.every(part => part.selectable && part.catalogStatus === 'active'));
    assert.ok(!catalog.some(part => [legacy.id, inactive.id].includes(part.id)));
  }
  const expanded = await get('?includeLegacy=true&type=storage');
  assert.ok(expanded.some(part => part.id === legacy.id && part.selectable === false));
  assert.ok(expanded.every(part => part.category === 'storage'));
  assert.ok(!expanded.some(part => part.id === inactive.id));
  const found = await get(`/${legacy.id}`);
  assert.equal(found.id, legacy.id);
  assert.equal(found.catalogStatus, 'legacy');
  assert.equal(found.price, null);
  await get(`/${inactive.id}`, 404);
  await get('/missing-id', 404);
});
