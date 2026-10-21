import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendBuildByBudget } from '../src/services/recommendationService.js';
import { selectBuildComponents, serializeBuildSelection } from '../src/services/build.service.js';
import { evaluateResolvedBuildCompatibility } from '../src/services/compatibility.service.js';
import { generateBuildSummary } from '../src/services/buildSummaryService.js';
import { saveBuild } from '../src/services/savedBuildsService.js';
import { exportSavedBuildToJson } from '../src/services/buildExportService.js';
import { createBuildShare } from '../src/services/shareBuildService.js';
import { buildToApiPayload, hydrateBuildComponents, hasCompleteBuild } from '../frontend/src/utils/buildHelpers.js';
import { changeSelection, undoBuildReplacement, reconcileBuildCatalog } from '../frontend/src/utils/buildTransitions.js';
import { listComponents } from '../src/services/component.service.js';
import { simulateProfessionalSoftwarePerformance, listProfessionalSoftware } from '../src/services/professionalSoftwareService.js';
import { compareBuilds } from '../src/services/buildComparisonService.js';
import { suggestUpgrades } from '../src/services/upgradeSuggestionService.js';
import { generateBuildReport } from '../src/services/buildReportService.js';
import { getPurchaseLinksByBuild } from '../src/services/purchaseLinksService.js';

const proposal = () => recommendBuildByBudget({ budget: { amount: 3000 }, usageType: 'study', selectionMode: 'price-and-compatibility', graphicsMode: 'integrated' });

test('economic integrated proposal includes six real products, shared 16GB, named boxed cooler and pending installed BIOS', () => {
  const r = proposal();
  assert.equal(r.totalEstimatedPrice, 2489.94);
  assert.equal(r.components.gpu, undefined);
  assert.equal(r.components.graphicsMode, 'integrated');
  assert.equal(r.components.ram.specs.capacityGb, 16);
  assert.equal(r.performanceScore, null);
  assert.equal(r.simulationAvailability.available, true);
  assert.equal(r.compatibilityStatus, 'compatible');
  assert.equal(r.biosSupport.minimumVersion, 'P2.30');
  assert.equal(r.biosSupport.installedVersion, null);
  assert.deepEqual(r.unverifiedChecks, []);
  assert.deepEqual(r.coolingAssessment.includedCooler, { name: 'AMD Wraith Stealth', sourceUrl: r.components.cpu.specs.includedCpuCooler.specSourceUrl, additionalPrice: 0, dimensionsVerified: false });
  assert.equal(r.coolingAssessment.scope, 'included_cooler_identity_only');
});

test('six slots require explicit mode; dedicated GPU, unsupported CPU and unknown motherboard output cannot be silently accepted', () => {
  const ids = serializeBuildSelection(proposal().components);
  assert.equal(selectBuildComponents(ids).gpu, undefined);
  const missing = { ...ids }; delete missing.graphicsMode;
  assert.throws(() => selectBuildComponents(missing), e => e.statusCode === 400);
  assert.throws(() => selectBuildComponents({ ...ids, gpuId: 'gpu-msi-rtx-3050-lp-6g-oc' }), e => e.statusCode === 400);
  const resolved = selectBuildComponents(ids);
  resolved.cpu = listComponents({ type: 'cpu' }).find(c => c.id === 'cpu-ryzen-5-5500');
  assert.ok(evaluateResolvedBuildCompatibility(resolved).alerts.some(c => c.code === 'CPU_HAS_NO_INTEGRATED_GRAPHICS'));
  resolved.cpu = proposal().components.cpu;
  resolved.motherboard = { ...resolved.motherboard, name: 'Other revision' };
  assert.ok(evaluateResolvedBuildCompatibility(resolved).unverifiedChecks.some(c => c.code === 'MOTHERBOARD_VIDEO_OUTPUT_UNVERIFIED'));
  assert.throws(() => recommendBuildByBudget({ budget: { amount: 3000 }, graphicsMode: 'integrated', selectionMode: 'price-and-compatibility', requirements: { minVramGb: 4 } }), e => e.statusCode === 400);
});

test('published BIOS support does not forge installed firmware or accept beta versions', () => {
  const r = globalThis.structuredClone(proposal().components);
  for (const [bios, code] of [['P2.10', 'CPU_BIOS_BELOW_MINIMUM'], ['P2.30B', 'CPU_BIOS_UNVERIFIED']]) {
    r.motherboard.specs.installedBiosVersion = bios;
    const result = evaluateResolvedBuildCompatibility(r);
    assert.ok(![...result.alerts, ...result.unverifiedChecks].some(c => c.code === code));
  }
  r.motherboard.specs.installedBiosVersion = 'P2.30';
  const result = evaluateResolvedBuildCompatibility(r);
  assert.equal(result.compatible, true);
  assert.equal(result.coolingAssessment.status, 'unverified');
  assert.deepEqual(result.graphicsAssessment.outputs, ['HDMI', 'DVI-D', 'VGA']);
});

test('summary, save, JSON export and private share preserve six pieces and independent useful sections without FPS', () => {
  const build = serializeBuildSelection(proposal().components);
  const budget = { amount: 3000, currency: 'BRL' };
  const summary = generateBuildSummary({ build, budget, usageType: 'study' });
  assert.equal(summary.selectionStatus, 'complete');
  assert.equal(summary.totalEstimatedPrice, 2489.94);
  assert.equal(summary.bottlenecks.available, true);
  assert.equal(summary.sections.recommendation.status, 'available');
  const saved = saveBuild({ name: 'Test integrated entry', components: build, budget, usageType: 'study' });
  assert.equal(saved.components.graphicsMode, 'integrated');
  const exported = exportSavedBuildToJson(saved.id, { includeSummary: true });
  assert.equal(exported.build.components.graphicsMode, 'integrated');
  assert.equal(exported.build.components.gpuId, undefined);
  assert.equal(exported.summary.totalEstimatedPrice, 2489.94);
  const shared = createBuildShare({ buildId: saved.id });
  assert.equal(shared.buildSummary.componentIds.graphicsMode, 'integrated');
  assert.equal(shared.buildSummary.totalEstimatedPrice, 2489.94);
  const links = getPurchaseLinksByBuild(build);
  assert.equal(Object.keys(links).length, 6);
  assert.equal(links.gpu, undefined);
  const report = generateBuildReport({ build, budget, includePurchaseLinks: true });
  assert.equal(report.components.graphicsMode, 'integrated');
  assert.equal(report.components.gpu, undefined);
});

test('frontend hydration, catalog refresh and undo retain explicit graphics mode and budget', () => {
  const r = proposal();
  const map = Object.fromEntries(listComponents().map(c => [c.id, c]));
  const selectedComponents = hydrateBuildComponents(serializeBuildSelection(r.components), map);
  assert.equal(hasCompleteBuild(selectedComponents), true);
  assert.equal(buildToApiPayload(selectedComponents).graphicsMode, 'integrated');
  const initial = { selectedComponents, budget: { amount: 3000 }, replacementHistory: [], revision: 0 };
  const refreshed = reconcileBuildCatalog(initial, map);
  assert.equal(refreshed.selectedComponents.graphicsMode, 'integrated');
  const dedicated = { ...selectedComponents, graphicsMode: 'dedicated', gpu: map['gpu-msi-rtx-3050-lp-6g-oc'] };
  const next = changeSelection(initial, dedicated);
  const undone = undoBuildReplacement(next);
  assert.equal(undone.selectedComponents.graphicsMode, 'integrated');
  assert.equal(undone.selectedComponents.gpu, undefined);
  assert.deepEqual(undone.budget, initial.budget);
});

test('software and whole-build comparisons cannot apply a dedicated GPU model to six-part selections', () => {
  const build = serializeBuildSelection(proposal().components);
  const result = simulateProfessionalSoftwarePerformance({ build, softwareId: listProfessionalSoftware()[0].id });
  assert.equal(result.available, true);
  assert.equal(result.estimation.measuredBenchmark, false);
  assert.ok(Number.isFinite(result.performanceScore));
  const comparison = compareBuilds({ builds: [{ components: build }, { components: build }] });
  assert.ok(Number.isFinite(comparison.builds[0].performanceScore));
  assert.ok(Number.isFinite(comparison.builds[0].costBenefitScore));
  assert.notEqual(comparison.recommendedBuild.available, false);
  const upgrades = suggestUpgrades({ build, budget: { amount: 1000 } });
  assert.ok(upgrades.suggestions.every(suggestion => suggestion.componentType !== 'gpu'));
  assert.ok(upgrades.suggestions.every(suggestion => suggestion.estimatedUpgradeCost <= 1000));
});
