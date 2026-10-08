import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { URL } from 'node:url';
import { app } from '../src/app.js';
import { components } from '../src/data/components.mock.js';
import { replacementCatalog, replacementMapping } from '../src/data/catalogReplacements.js';
import { listComponentRecords, resolveComponentRecordById } from '../src/data/component.repository.js';
import { findPerformanceParameterRecordByComponentId } from '../src/data/performance-parameter.repository.js';
import { findComponentById, listComponents } from '../src/services/component.service.js';
import { selectBuildComponents, serializeBuildSelection, calculateBuildPrice } from '../src/services/build.service.js';
import { checkBuildCompatibility, evaluateResolvedBuildCompatibility } from '../src/services/compatibility.service.js';
import { previewCatalogCompatibility } from '../src/services/catalogCompatibilityService.js';
import { getCoolingPower } from '../src/services/cooling.service.js';
import { referencePrice, summarizeBuildPricing } from '../src/services/marketPriceService.js';
import { generateBuildSummary } from '../src/services/buildSummaryService.js';
import { generateBuildReport } from '../src/services/buildReportService.js';
import { calculateBuildScore } from '../src/services/buildScoreService.js';
import { compareBuilds } from '../src/services/buildComparisonService.js';
import { simulateGamePerformance } from '../src/services/gamePerformanceService.js';
import { saveBuild, getSavedBuildById, updateSavedBuild, deleteSavedBuild } from '../src/services/savedBuildsService.js';
import { createSavedBuildVersion, getSavedBuildVersionById } from '../src/services/savedBuildVersionsService.js';
import { exportBuildToJson, exportSavedBuildToJson } from '../src/services/buildExportService.js';
import { createBuildShare, getSharedBuildById } from '../src/services/shareBuildService.js';
import { getPurchaseLinksByComponentId } from '../src/services/purchaseLinksService.js';
import { suggestUpgrades } from '../src/services/upgradeSuggestionService.js';
import { generateUpgradeRoadmap } from '../src/services/upgradeRoadmapService.js';
import { recommendBuildByBudget, recommendBuildsByBudgetRange } from '../src/services/recommendationService.js';
import { listReadyBuilds } from '../src/services/readyBuildsService.js';

// This fixture is frozen at the pre-replacement commit. Never regenerate it from current data.
const baseline = JSON.parse(readFileSync(new URL('./fixtures/legacy-catalog-identities.json', import.meta.url), 'utf8'));
const originals = new Map(baseline.components.map(component => [component.id, component]));
const mappings = Object.entries(replacementMapping);
const retiredIds = new Set(mappings.map(([id]) => id));
const replacementIds = new Set(mappings.map(([, id]) => id));
const raw = id => components.find(component => component.id === id);
const parameter = id => findPerformanceParameterRecordByComponentId(id);
const clone = value => globalThis.structuredClone(value);
const money = value => Number(value.toFixed(2));
const base = {
  cpuId: 'cpu-ryzen-5-5600', motherboardId: 'mb-b550m-aorus-elite', gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4', storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w', caseId: 'case-mid-tower-airflow'
};
const simulation = { gameId: 'game-valorant', targetResolution: '1080p', qualityPreset: 'high' };
const fanPackId = 'fan-coolermaster-sickleflow-edge-120-argb-white-3-pack';
const newBoardId = 'mb-gigabyte-b650m-d3hp';
const newCaseId = 'case-cooler-master-elite-502-white';

function buildWith(component) {
  const build = { ...base };
  if ((component.category === 'motherboard' && component.specs.socket === 'AM5')
    || (component.category === 'ram' && component.specs.memoryType === 'DDR5')) {
    Object.assign(build, { cpuId: 'cpu-ryzen-5-7600', motherboardId: 'mb-gigabyte-b650-gaming-x-ax', ramId: 'ram-kf560c40bbk2-32' });
  }
  if (component.category === 'fan') build.fans = [{ fanId: component.id, quantity: 2 }];
  else build[`${component.category}Id`] = component.id;
  return build;
}
function selectedPart(selection, category) { return category === 'fan' ? selection.fans[0] : selection[category]; }
function saveForTest(t, name, build) {
  const saved = saveBuild({ name, components: build });
  t.after(() => deleteSavedBuild(saved.id));
  return saved;
}
function assertExactPart(selected, expected) {
  const actual = selectedPart(selected, expected.category);
  assert.equal(actual.id, expected.id);
  assert.equal(actual.name, expected.name);
  assert.deepEqual(actual.specs, expected.specs);
  assert.equal(actual.price, expected.price);
  assert.equal(actual.pricing.productId, expected.id);
}
function assertSelectedPrices(selected, pricing) {
  const entries = Object.entries(selected).flatMap(([slot, value]) => slot === 'fans'
    ? value.map(fan => [fan, fan.quantity]) : [[value, 1]]);
  const total = entries.some(([part]) => part.price === null) ? null
    : money(entries.reduce((sum, [part, quantity]) => sum + part.price * quantity, 0));
  assert.equal(pricing.estimatedTotal, total);
  for (const [part, quantity] of entries) {
    const line = pricing.referenceComponents.find(item => item.productId === part.id);
    assert.ok(line, part.id);
    assert.equal(line.price, part.price, part.id);
    assert.equal(line.quantity, quantity, part.id);
  }
  return total;
}

// Count follows completed mappings, including many historical IDs sharing one successor.
test('completed replacement mappings preserve immutable retired identities and exclude them from all new-catalog lists', () => {
  assert.equal(baseline.sourceCommit, '75cd9836dcdb6bf7074ffe591c82614cc439ccf2');
  assert.ok(mappings.length > 0);
  assert.equal(new Set(components.map(component => component.id)).size, components.length);
  assert.deepEqual(new Set(replacementCatalog.map(component => component.id)), replacementIds);
  for (const [oldId, newId] of mappings) {
    const expected = originals.get(oldId);
    const old = raw(oldId);
    const next = raw(newId);
    assert.ok(expected, `Missing immutable baseline: ${oldId}`);
    assert.ok(next, newId);
    assert.notEqual(oldId, newId);
    for (const field of ['name', 'brand', 'category', 'specs', 'price']) assert.deepEqual(old[field], expected[field], `${oldId}: ${field}`);
    assert.equal(parameter(oldId)?.performanceScore ?? null, expected.performanceScore, oldId);
    assert.equal(old.active, false);
    assert.equal(old.lifecycle, 'legacy');
    assert.equal(old.replacementId, newId);
    assert.strictEqual(resolveComponentRecordById(oldId), old);
    assert.equal(next.category, old.category);
    assert.equal(next.active, true);
    assert.equal(next.catalogRevision, '2026-10-08-replacements');
    assert.ok(next.partNumber);
    const legacy = findComponentById(oldId);
    assert.equal(legacy.catalogStatus, 'legacy');
    assert.equal(legacy.selectable, false);
    assert.deepEqual(legacy.replacement, { id: newId, name: next.name, category: next.category, requiresSelection: true });
    assert.equal(findComponentById(newId).selectable, true);
  }
  for (const listed of [listComponentRecords(), listComponents()]) {
    assert.ok(listed.every(component => !retiredIds.has(component.id)));
    assert.equal(listed.filter(component => replacementIds.has(component.id)).length, replacementIds.size);
  }
  const inclusive = listComponents({ includeLegacy: true });
  assert.equal(inclusive.filter(component => retiredIds.has(component.id)).length, retiredIds.size);
});

test('every new model has its own exact dated available observation without claiming current stock or live offers', () => {
  for (const id of replacementIds) {
    const component = raw(id);
    const price = referencePrice(component);
    assert.ok(component.price > 0, id);
    assert.equal(price.productId, id);
    assert.equal(price.model, component.partNumber);
    assert.equal(price.price, component.price);
    assert.equal(price.currency, 'BRL');
    assert.equal(price.queriedAt, '2026-10-08');
    assert.equal(price.observedAvailability, 'available', id);
    assert.equal(price.availability, 'unknown');
    assert.equal(price.source, 'dated_public_reference');
    assert.equal(price.updateStatus, 'dated_snapshot');
    assert.equal(price.isMarketQuote, false);
    assert.equal(price.validUntil, null);
    assert.equal(price.referenceScope, 'exact');
    assert.match(price.productUrl, /^https:\/\//);
    assert.ok(price.seller);
    assert.ok(price.availabilityEvidence);
    for (const link of getPurchaseLinksByComponentId(id)) {
      assert.equal(link.componentId, id);
      assert.equal(link.referencePricing.productId, id);
      assert.equal(link.referencePricing.price, component.price);
      assert.equal(link.availabilityStatus, 'unknown');
      assert.notEqual(link.kind, 'offer');
      assert.equal(link.marketStatus, 'no_current_quote');
    }
  }
});

test('replacement photo metadata identifies the new SKU and matches the actual checked local asset', () => {
  for (const id of replacementIds) {
    const component = raw(id);
    const image = component.image;
    assert.equal(image.componentId, id);
    assert.equal(image.status, 'verified', id);
    assert.equal(image.imageType, 'photo');
    assert.equal(image.pixelVerified, true);
    assert.ok(['exact-model', 'model-family'].includes(image.identityLevel), id);
    assert.ok(image.identityNotes);
    assert.ok(image.rightsBasis);
    assert.ok(image.originalAssetUrl);
    assert.ok(image.manufacturerProductUrl);
    assert.equal(image.lastVerifiedAt, '2026-10-08');
    assert.match(image.imagePath, /^\/images\/components\//);
    assert.ok(image.width > 0 && image.height > 0);
    const bytes = readFileSync(new URL(`../frontend/public${image.imagePath}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), image.sha256, id);
  }
});

test('new RAM and storage scores are derived from their real inputs with the documented internal formulas', () => {
  for (const source of replacementCatalog) {
    const component = findComponentById(source.id);
    const score = parameter(source.id);
    const exposed = listComponents({ category: source.category }).find(item => item.id === source.id);
    if (!['ram', 'storage'].includes(source.category)) {
      assert.equal(score, null, source.id);
      assert.equal(exposed.performanceScore, null);
      assert.equal(exposed.performanceMethodology, null);
      continue;
    }
    const specs = component.specs;
    const expected = source.category === 'ram'
      ? Math.min(92, 50 + specs.capacityGb / 2 + (specs.speedMhz - 3200) / 200)
      : Math.min(92, 50 + specs.readSpeedMbS / 200);
    assert.equal(score.performanceScore, expected, source.id);
    assert.equal(score.gamingScore, expected);
    assert.equal(score.productivityScore, expected);
    assert.equal(exposed.performanceScore, expected);
    assert.equal(score.capacity, specs.capacityGb);
    assert.equal(score.scoreKind, 'internal-demonstrative');
    assert.match(score.scoreDisclaimer, /não é benchmark/);
    assert.match(score.scoreLimitations, /não mede/);
    if (source.category === 'ram') {
      assert.equal(score.speed, specs.speedMhz);
      assert.equal(score.memoryType, specs.memoryType);
      assert.deepEqual(score.scoreInputs, { capacityGb: specs.capacityGb, speedMhz: specs.speedMhz });
      assert.equal(score.scoreFormula, 'min(92, 50 + capacityGb / 2 + (speedMhz - 3200) / 200)');
      assert.equal(specs.capacityGb, specs.modulesPerKit * specs.capacityPerModuleGb);
      assert.equal(specs.dataRateMTs, specs.speedMhz);
    } else {
      assert.equal(score.interface, specs.interface);
      assert.equal(score.readSpeed, specs.readSpeedMbS);
      assert.equal(score.writeSpeed, specs.writeSpeedMbS);
      assert.deepEqual(score.scoreInputs, { readSpeedMbS: specs.readSpeedMbS });
      assert.equal(score.scoreFormula, 'min(92, 50 + readSpeedMbS / 200)');
    }
  }
  // These deliberate tradeoffs catch copying the discontinued model's old score.
  assert.equal(parameter('ram-kvr32n22d8-32').performanceScore, 66);
  assert.equal(originals.get('ram-crucial-32gb-ddr4-3200').performanceScore, 72);
  assert.equal(parameter('ssd-xpg-gammix-s70-blade-1tb').performanceScore, 87);
  assert.equal(originals.get('ssd-samsung-980-pro-1tb').performanceScore, 88);
});

test('approved substitutes keep their real capacity, interface, module count and package quantity', () => {
  assert.equal(raw('ssd-kingston-nv3-500gb').specs.capacityGb, 500);
  assert.equal(raw('ssd-samsung-970-evo-plus-250gb').specs.capacityGb, 250);
  assert.equal(raw('ssd-kingston-nv3-4tb').specs.interface, 'M.2 NVMe');
  assert.equal(raw('ssd-samsung-870-evo-4000gb').specs.interface, 'SATA');
  assert.equal(raw('ram-kvr32n22d8-32').specs.modulesPerKit, 1);
  assert.equal(raw('ram-kf432c16bb12ak2-32').specs.modulesPerKit, 2);
  assert.equal(raw(fanPackId).specs.unitsPerPack, 3);
  assert.equal(raw('fan-arctic-p12-pwm-pst-5-pack').specs.unitsPerPack, 5);
});

test('new B650 motherboard enforces AM5 and DDR5 and uses declared slot/capacity limits', () => {
  const matching = buildWith(raw(newBoardId));
  const valid = checkBuildCompatibility(matching);
  assert.equal(valid.status, 'compatible');
  assert.equal(valid.selectedComponents.motherboard.specs.memorySlots, 4);
  assert.equal(valid.selectedComponents.motherboard.specs.maxMemoryGb, 256);
  assert.ok(checkBuildCompatibility({ ...matching, cpuId: base.cpuId }).alerts.some(alert => alert.code === 'CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE'));
  assert.ok(checkBuildCompatibility({ ...matching, ramId: 'ram-kvr32n22d8-32' }).alerts.some(alert => alert.code === 'RAM_MOTHERBOARD_TYPE_INCOMPATIBLE'));
  for (const { id } of replacementCatalog.filter(component => component.category === 'ram')) {
    const result = checkBuildCompatibility(buildWith(raw(id)));
    assert.equal(result.status, 'compatible', id);
    assert.ok(!result.unverifiedChecks.some(check => /RAM_(SLOT|CAPACITY)/.test(check.code)), id);
  }
});

test('new RAM validates both slot count and capacity boundaries and missing paired limits stay unverified', () => {
  const selected = selectBuildComponents(buildWith(raw('ram-kf432c16bb2ak2-64')));
  const evaluate = specs => evaluateResolvedBuildCompatibility({ ...selected, motherboard: { ...selected.motherboard, specs: { ...selected.motherboard.specs, ...specs } } });
  assert.equal(evaluate({ memorySlots: 2, maxMemoryGb: 64 }).status, 'compatible');
  assert.ok(evaluate({ memorySlots: 1, maxMemoryGb: 64 }).alerts.some(alert => alert.code === 'RAM_SLOT_COUNT_EXCEEDED'));
  assert.ok(evaluate({ memorySlots: 2, maxMemoryGb: 32 }).alerts.some(alert => alert.code === 'RAM_CAPACITY_EXCEEDED'));
  const unknown = evaluate({ memorySlots: null, maxMemoryGb: null });
  assert.equal(unknown.status, 'unverified');
  assert.ok(unknown.unverifiedChecks.some(check => check.code === 'RAM_SLOT_COUNT_UNVERIFIED'));
  assert.ok(unknown.unverifiedChecks.some(check => check.code === 'RAM_CAPACITY_LIMIT_UNVERIFIED'));
  assert.equal(unknown.alerts.length, 0);
});

test('new NVMe models require their actual M.2 length and SATA-to-NVMe replacement changes compatibility', () => {
  for (const component of replacementCatalog.filter(item => item.category === 'storage' && item.specs.interface === 'M.2 NVMe')) {
    const selected = selectBuildComponents(buildWith(component));
    const evaluate = specs => evaluateResolvedBuildCompatibility({ ...selected, motherboard: { ...selected.motherboard, specs: { ...selected.motherboard.specs, ...specs } } });
    assert.equal(component.specs.m2LengthMm, 80);
    assert.equal(evaluate({ m2SupportedLengthsMm: [80] }).status, 'compatible');
    assert.ok(evaluate({ m2SupportedLengthsMm: [42, 60] }).alerts.some(alert => alert.code === 'M2_LENGTH_INCOMPATIBLE'));
    const unknown = evaluate({ m2SupportedLengthsMm: undefined });
    assert.equal(unknown.status, 'unverified');
    assert.ok(unknown.unverifiedChecks.some(check => check.code === 'M2_LENGTH_UNVERIFIED'));
  }
  const selected = selectBuildComponents(buildWith(raw('ssd-kingston-nv3-4tb')));
  const sataOnly = { ...selected.motherboard, specs: { ...selected.motherboard.specs, storageInterfaces: ['SATA'] } };
  assert.ok(evaluateResolvedBuildCompatibility({ ...selected, motherboard: sataOnly }).alerts.some(alert => alert.code === 'STORAGE_INTERFACE_INCOMPATIBLE'));
  assert.equal(evaluateResolvedBuildCompatibility({ ...selected, motherboard: sataOnly, storage: findComponentById('ssd-samsung-870-evo-4000gb') }).status, 'compatible');
});

test('new case uses its smaller cooler-height limit without fabricating RAM/VRM or radiator clearance', () => {
  const selected = selectBuildComponents({ ...base, coolerId: 'cooler-bequiet-pure-rock-3-black' });
  assert.equal(raw(newCaseId).specs.maxCoolerHeightMm, 170);
  assert.equal(raw('case-montech-air-903-base').specs.maxCoolerHeightMm, 180);
  const boundaryCooler = { ...selected.cooler, specs: { ...selected.cooler.specs, heightMm: 175 } };
  const withCase = id => evaluateResolvedBuildCompatibility({ ...selected, cooler: boundaryCooler, case: findComponentById(id) });
  assert.ok(!withCase('case-montech-air-903-base').alerts.some(alert => alert.code === 'CASE_COOLER_HEIGHT_INCOMPATIBLE'));
  assert.ok(withCase(newCaseId).alerts.some(alert => alert.code === 'CASE_COOLER_HEIGHT_INCOMPATIBLE'));
  const fits = checkBuildCompatibility({ ...base, caseId: newCaseId, coolerId: selected.cooler.id });
  assert.ok(!fits.alerts.some(alert => alert.code === 'CASE_COOLER_HEIGHT_INCOMPATIBLE'));
  assert.ok(fits.unverifiedChecks.some(check => check.code === 'AIR_COOLER_CLEARANCE_UNVERIFIED'));
  const aio = checkBuildCompatibility({ ...base, caseId: newCaseId, coolerId: 'cooler-arctic-liquid-freezer-iii-pro-360' });
  assert.ok(aio.unverifiedChecks.some(check => check.code === 'RADIATOR_CLEARANCE_UNVERIFIED'));
});

test('three-fan pack charges by purchased packs, counts physical units once, and keeps controller power unknown', () => {
  const pack = raw(fanPackId);
  assert.equal(pack.specs.powerWatts, 3.45);
  assert.equal(pack.specs.unitsPerPack, 3);
  assert.equal(pack.specs.auxiliaryPowerUnknown, true);
  assert.ok(pack.specs.auxiliaryPowerNotes);
  const plain = selectBuildComponents(base);
  for (const quantity of [1, 2]) {
    const build = { ...base, fans: [{ fanId: fanPackId, quantity }] };
    const selected = selectBuildComponents(build);
    const pricing = summarizeBuildPricing(selected);
    const price = money(calculateBuildPrice(plain) + pack.price * quantity);
    assert.equal(calculateBuildPrice(selected), price);
    assert.equal(pricing.estimatedTotal, price);
    const line = pricing.referenceComponents.find(item => item.productId === fanPackId);
    assert.equal(line.quantity, quantity);
    assert.equal(line.price, pack.price);
    assert.deepEqual(getCoolingPower(selected), { knownWatts: money(10.35 * quantity), complete: false, unknownComponents: [fanPackId] });
    const capacityBuild = { ...selected, case: { ...selected.case, specs: { ...selected.case.specs, fanMounts: [{ diameterMm: 120, capacity: quantity * 3 }], includedFanCount: 0, maxFanThicknessMm: 25 } } };
    assert.ok(!evaluateResolvedBuildCompatibility(capacityBuild).alerts.some(alert => alert.code === 'CASE_FAN_CAPACITY_EXCEEDED'));
    capacityBuild.case.specs.fanMounts[0].capacity -= 1;
    assert.ok(evaluateResolvedBuildCompatibility(capacityBuild).alerts.some(alert => alert.code === 'CASE_FAN_CAPACITY_EXCEEDED'));
    assert.ok(checkBuildCompatibility(build).unverifiedChecks.some(check => check.code === 'COOLING_POWER_UNVERIFIED'));
  }
});

for (const [oldId, newId] of mappings) {
  test(`real retirement round-trips ${oldId} without silently choosing ${newId}`, t => {
    const old = raw(oldId);
    const next = raw(newId);
    const oldBuild = buildWith(old);
    const newBuild = buildWith(next);
    const inputSnapshot = clone(oldBuild);
    const saved = saveForTest(t, `Historical ${oldId}`, oldBuild);
    const savedIds = clone(saved.components);
    const version = createSavedBuildVersion(saved.id, { buildSnapshot: saved, reason: 'Historical identity' });
    const shared = createBuildShare({ buildId: saved.id });
    const sharedSnapshot = clone(shared);
    const summary = generateBuildSummary({ build: oldBuild });
    const exported = exportSavedBuildToJson(saved.id, { includeSummary: true });
    const imported = saveForTest(t, `Import ${oldId}`, JSON.parse(JSON.stringify(exported)).build.components);
    const report = generateBuildReport({ build: oldBuild });
    const comparison = compareBuilds({ builds: [{ name: 'Historical', components: oldBuild }, { name: 'Explicit replacement', components: newBuild }], comparisonCriteria: 'performance' });
    assert.deepEqual(exportBuildToJson({ build: oldBuild }).build.components, oldBuild);
    assert.deepEqual(exported.build.components, oldBuild);
    assert.deepEqual(imported.components, savedIds);
    assert.deepEqual(shared.buildSummary.componentIds, savedIds);
    assert.deepEqual(getSavedBuildVersionById(saved.id, version.id).buildSnapshot.components, savedIds);
    assertExactPart(summary.components, old);
    assertExactPart(report.components, old);
    assertExactPart(shared.buildSummary.components, old);
    assertExactPart(comparison.builds[0].components, old);
    assert.equal(summary.totalEstimatedPrice, null);
    assert.equal(saved.totalEstimatedPrice, null);
    assert.equal(exported.summary.totalEstimatedPrice, null);
    assert.equal(report.pricing.totalEstimatedPrice, null);
    assert.ok(summary.pricing.componentsWithoutReference.includes(oldId));
    assert.equal(shared.buildSummary.totalEstimatedPrice, null);
    assertExactPart(comparison.builds[1].components, next);
    assert.equal(comparison.builds[0].totalEstimatedPrice, null);
    assert.equal(comparison.builds[1].totalEstimatedPrice,
      assertSelectedPrices(comparison.builds[1].components, comparison.builds[1].pricing));
    const upgrades = suggestUpgrades({ build: oldBuild, budget: { amount: 1 } });
    assert.equal(upgrades.currentBuildSummary.totalEstimatedPrice, null);
    assert.ok(upgrades.currentBuildSummary.pricing.componentsWithoutReference.includes(oldId));
    assert.deepEqual(upgrades.suggestions, []);
    assert.deepEqual(oldBuild, inputSnapshot);
    updateSavedBuild(saved.id, { name: `Renamed ${oldId}` });
    assert.deepEqual(getSavedBuildById(saved.id).components, savedIds);
    updateSavedBuild(saved.id, { components: serializeBuildSelection(selectBuildComponents(newBuild)) });
    assertExactPart(selectBuildComponents({ components: getSavedBuildById(saved.id).components }), next);
    assert.deepEqual(getSavedBuildVersionById(saved.id, version.id).buildSnapshot.components, savedIds);
    assert.deepEqual(getSharedBuildById(shared.shareId), sharedSnapshot);
    assert.deepEqual(imported.components, savedIds);
    assert.equal(raw(oldId).replacementId, newId);
  });
}

for (const id of replacementIds) {
  test(`explicit new selection ${id} uses its own specs and price in every stored and calculated flow`, t => {
    const component = raw(id);
    const build = buildWith(component);
    const selected = selectBuildComponents(build);
    const summary = generateBuildSummary({ build });
    const expectedTotal = assertSelectedPrices(selected, summary.pricing);
    assert.ok(expectedTotal > 0);
    assert.equal(calculateBuildPrice(selected), expectedTotal);
    const saved = saveForTest(t, `New ${id}`, build);
    const version = createSavedBuildVersion(saved.id, { buildSnapshot: saved });
    const exported = exportSavedBuildToJson(saved.id, { includeSummary: true });
    const imported = saveForTest(t, `Imported new ${id}`, exported.build.components);
    const shared = createBuildShare({ buildId: saved.id });
    const report = generateBuildReport({ build });
    const score = calculateBuildScore({ build });
    for (const selection of [summary.components, report.components, shared.buildSummary.components, selectBuildComponents({ components: imported.components })]) assertExactPart(selection, component);
    for (const total of [summary.totalEstimatedPrice, saved.totalEstimatedPrice, imported.totalEstimatedPrice, exported.summary.totalEstimatedPrice, shared.buildSummary.totalEstimatedPrice, report.pricing.totalEstimatedPrice, score.source.totalEstimatedPrice]) assert.equal(total, expectedTotal, id);
    assert.deepEqual(exported.build.components, build);
    assert.deepEqual(getSavedBuildVersionById(saved.id, version.id).buildSnapshot.components, saved.components);
    assert.deepEqual(shared.buildSummary.componentIds, saved.components);
    assert.equal(summary.pricing.availableMarketQuotesTotal, null);
    assert.equal(summary.pricing.marketTotalComplete, false);
  });
}

test('new cooling contributes no FPS bonus and unknown clearances block full-build simulations', () => {
  const partial = { cpuId: base.cpuId, gpuId: base.gpuId, ramId: base.ramId, storageId: base.storageId };
  const original = simulateGamePerformance({ ...simulation, build: partial });
  for (const component of replacementCatalog.filter(item => ['cooler', 'fan'].includes(item.category))) {
    const optional = component.category === 'cooler' ? { coolerId: component.id } : { fans: [{ fanId: component.id, quantity: 2 }] };
    const result = simulateGamePerformance({ ...simulation, build: { ...partial, ...optional } });
    assert.equal(result.estimatedFps, original.estimatedFps, component.id);
    assert.equal(result.technicalDetails.weightedPerformanceIndex, original.technicalDetails.weightedPerformanceIndex);
    assert.throws(() => simulateGamePerformance({ ...simulation, build: { ...base, ...optional } }), { statusCode: 422 });
  }
});

test('motherboard and case substitutions add no synthetic FPS parameters or partial-simulation bonus', () => {
  const partial = { cpuId: base.cpuId, gpuId: base.gpuId, ramId: base.ramId, storageId: base.storageId };
  const before = simulateGamePerformance({ ...simulation, build: partial });
  for (const id of [newBoardId, newCaseId]) {
    const component = raw(id);
    assert.equal(parameter(id), null);
    const after = simulateGamePerformance({ ...simulation, build: { ...partial, [`${component.category}Id`]: id } });
    assert.equal(after.estimatedFps, before.estimatedFps);
    assert.equal(after.technicalDetails.weightedPerformanceIndex, before.technicalDetails.weightedPerformanceIndex);
    assert.equal(after.technicalDetails.compatibility.scope, 'partial_build');
    assert.equal(after.technicalDetails.compatibility.status, 'unverified');
  }
});

test('upgrades price actual new core parts and quantified cooling without silently dropping uncertain accessories', () => {
  const build = { ...base, ramId: 'ram-kf432c16bb12ak2-32', storageId: 'ssd-kingston-nv3-500gb',
    caseId: newCaseId, coolerId: 'cooler-bequiet-pure-rock-3-black', fans: [{ fanId: fanPackId, quantity: 2 }] };
  const original = clone(build);
  const selected = selectBuildComponents(build);
  const result = suggestUpgrades({ build, budget: { amount: 1 } });
  const total = assertSelectedPrices(selected, result.currentBuildSummary.pricing);
  assert.equal(result.currentBuildSummary.totalEstimatedPrice, total);
  assert.equal(total, calculateBuildPrice(selected));
  assert.deepEqual(result.suggestions, []);
  const roadmap = generateUpgradeRoadmap({ build, totalBudget: 1 });
  assert.equal(roadmap.currentBuildSummary.totalEstimatedPrice, total);
  assert.equal(roadmap.initialCompatibility.status, 'unverified');
  assert.deepEqual(roadmap.steps, []);
  assert.deepEqual(build, original);
});

test('upgrades and roadmap leave actual legacy inputs intact and never offer retired candidates', t => {
  const build = { ...base, ramId: 'ram-crucial-32gb-ddr4-3200', storageId: 'ssd-samsung-970-evo-plus-250gb' };
  const snapshot = clone(build);
  const saved = saveForTest(t, 'Historical upgrades', build);
  const savedSnapshot = clone(saved);
  const upgrades = suggestUpgrades({ buildId: saved.id, budget: { amount: 10000 }, usageType: 'gaming', priority: 'performance' });
  assert.equal(upgrades.currentBuildSummary.totalEstimatedPrice, null);
  assert.ok(upgrades.currentBuildSummary.pricing.componentsWithoutReference.includes(build.storageId));
  assert.ok(upgrades.suggestions.length > 0);
  for (const suggestion of upgrades.suggestions) {
    assert.equal(suggestion.currentComponent.id, build[`${suggestion.componentType}Id`]);
    assert.ok(!retiredIds.has(suggestion.suggestedComponent.id));
    assert.equal(suggestion.estimatedUpgradeCost, raw(suggestion.suggestedComponent.id).price);
    assert.equal(suggestion.suggestedComponent.selectable, true);
  }
  const roadmap = generateUpgradeRoadmap({ build, totalBudget: 10000, maxSteps: 3, priority: 'performance' });
  const cumulativeIds = serializeBuildSelection(selectBuildComponents(build));
  for (const step of roadmap.steps) {
    assert.ok(!retiredIds.has(step.suggestedComponent.id));
    assert.equal(step.currentComponent.id, cumulativeIds[step.componentType]);
    cumulativeIds[step.componentType] = step.suggestedComponent.id;
    assert.deepEqual(step.buildAfterStep, cumulativeIds);
    assert.equal(step.estimatedCost, raw(step.suggestedComponent.id).price);
  }
  assert.deepEqual(build, snapshot);
  assert.deepEqual(getSavedBuildById(saved.id), savedSnapshot);
});

test('recommendations use active exact-model prices and reject uncertain selected cooling instead of replacing it', () => {
  const recommended = recommendBuildByBudget({ budget: { amount: 15000 }, usageType: 'gaming' });
  assert.ok(Object.values(recommended.components).every(component => !retiredIds.has(component.id)));
  assert.equal(recommended.totalEstimatedPrice, calculateBuildPrice(recommended.components));
  // Restrict availability, not identity/specs/scores, to exercise a known new-model combination.
  const chosen = { ...base, ramId: 'ram-kvr32n22d8-32', storageId: 'ssd-kingston-nv3-500gb', caseId: newCaseId };
  const allowed = new Set(Object.values(chosen));
  const previous = components.map(component => [component, component.active, Object.hasOwn(component, 'active')]);
  try {
    for (const component of components) if (!allowed.has(component.id)) component.active = false;
    const total = calculateBuildPrice(selectBuildComponents(chosen));
    const one = recommendBuildByBudget({ budget: { amount: total + 1 }, usageType: 'gaming' });
    const range = recommendBuildsByBudgetRange({ budgetRange: { min: total, max: total + 1 }, usageType: 'gaming' });
    for (const result of [one, ...range]) {
      assert.deepEqual(serializeBuildSelection(result.components), serializeBuildSelection(selectBuildComponents(chosen)));
      assert.equal(result.totalEstimatedPrice, total);
      for (const id of [chosen.ramId, chosen.storageId, chosen.caseId]) assertExactPart(result.components, raw(id));
    }
  } finally {
    for (const [component, active, hadActive] of previous) {
      if (hadActive) component.active = active;
      else delete component.active;
    }
  }
  for (const id of [fanPackId, 'fan-arctic-p12-pwm-pst-5-pack']) {
    const input = { budget: { amount: 15000 }, fans: [{ fanId: id, quantity: 1 }] };
    const before = clone(input);
    assert.throws(() => recommendBuildByBudget(input), { statusCode: 422 });
    assert.deepEqual(input, before);
  }
});

test('replacement compatibility previews agree with full-build checks and omit every retired choice', () => {
  const preview = previewCatalogCompatibility(base);
  assert.ok(preview.every(item => !retiredIds.has(item.componentId)));
  for (const id of replacementIds) {
    const component = raw(id);
    const build = component.category === 'fan' ? { ...base, fans: [{ fanId: id, quantity: 1 }] } : { ...base, [`${component.category}Id`]: id };
    const full = checkBuildCompatibility(build);
    const candidate = preview.find(item => item.componentId === id);
    assert.ok(candidate, id);
    assert.equal(candidate.status, full.status, id);
    assert.deepEqual(candidate.alerts, full.alerts, id);
    assert.deepEqual(candidate.unverifiedChecks, full.unverifiedChecks, id);
  }
});

test('ready builds select active identities and recalculate their new dated references', () => {
  for (const build of listReadyBuilds()) {
    const selected = selectBuildComponents(build.components);
    assert.ok(Object.values(selected).every(component => !retiredIds.has(component.id)), build.id);
    assert.equal(build.estimatedTotalPrice, assertSelectedPrices(selected, build.pricing));
  }
});

test('HTTP catalog hides actual retired models by default while explicit legacy lookup preserves each identity', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/components`;
  async function get(path = '') {
    const response = await globalThis.fetch(`${url}${path}`);
    assert.equal(response.status, 200);
    return (await response.json()).data;
  }
  const active = await get();
  const legacy = await get('?includeLegacy=true');
  assert.ok(active.every(component => !retiredIds.has(component.id)));
  for (const [oldId, newId] of mappings) {
    const old = legacy.find(component => component.id === oldId);
    const next = active.find(component => component.id === newId);
    assert.equal(old.selectable, false, oldId);
    assert.equal(next.selectable, true, newId);
    assert.equal(old.replacement.id, newId);
    const lookup = await get(`/${oldId}`);
    assert.equal(lookup.id, oldId);
    assert.equal(lookup.name, originals.get(oldId).name);
    assert.deepEqual(lookup.specs, originals.get(oldId).specs);
    assert.equal(lookup.price, originals.get(oldId).price);
    assert.equal(lookup.replacement.requiresSelection, true);
  }
});
