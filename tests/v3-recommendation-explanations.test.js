import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendBuildByBudget, recommendBuildsByBudgetRange } from '../src/services/recommendationService.js';
import { explainBuildSelection, compareRecommendedSelection } from '../src/services/recommendationExplanationService.js';
import { createBuildSummaryGenerator, generateBuildSummary } from '../src/services/buildSummaryService.js';
import { evaluateResolvedBuildCompatibility } from '../src/services/compatibility.service.js';
import { requiredBuildSlots, selectBuildComponents } from '../src/services/build.service.js';
import { listComponents, findComponentById } from '../src/services/component.service.js';
import { listPerformanceParameters } from '../src/services/performanceParametersService.js';
import { summarizeBuildPricing } from '../src/services/marketPriceService.js';
import { currentBuild } from './helpers/current-build.js';

const parameters = () => new Map(listPerformanceParameters().map(parameter => [parameter.componentId, parameter]));
const recommend = (amount = 10000, usageType = 'gaming') => recommendBuildByBudget({ budget: { amount, priority: 'cost-benefit' }, usageType });
const rounded = value => Number(value.toFixed(2));
const fixtureBuild = () => {
  const base = selectBuildComponents({ cpuId: 'cpu-ryzen-5-5600', motherboardId: 'mb-b550m-aorus-elite', gpuId: 'gpu-rtx-4060',
    ramId: 'ram-kingston-fury-16gb-ddr4', storageId: 'ssd-kingston-nv2-1tb', psuId: 'psu-corsair-650w', caseId: 'case-mid-tower-airflow' });
  return Object.fromEntries(Object.entries(base).map(([slot, component]) => [slot, { id: `fixture-${slot}`, name: `Fixture ${slot}`,
    category: slot, price: 100, specs: globalThis.structuredClone(component.specs) }]));
};

test('v3 explanations cover every recommended part with exact prices, profile inputs and catalog fit facts', () => {
  const result = recommend();
  const explanation = result.selectionExplanation;
  assert.equal(explanation.selectionSource, 'recommendation');
  assert.equal(explanation.budget.total, result.totalEstimatedPrice);
  assert.equal(explanation.budget.remaining, result.remainingBudget);
  assert.equal(explanation.budget.status, 'within_budget');
  assert.equal(explanation.budget.coolingSubtotal, 0);
  assert.deepEqual(explanation.componentReasons.map(reason => reason.slot), requiredBuildSlots);
  assert.equal(rounded(explanation.componentReasons.reduce((sum, reason) => sum + reason.budget.lineTotal, 0)), result.totalEstimatedPrice);
  for (const reason of explanation.componentReasons) {
    assert.equal(reason.componentId, result.components[reason.slot].id);
    assert.equal(reason.profile.usageType, 'gaming');
    assert.equal(reason.compatibility.status, 'compatible');
    assert.ok(reason.facts.length);
    assert.ok(reason.compatibility.facts.length);
    assert.match(reason.selectionReason, /seleção é do conjunto/);
    assert.match(reason.performance.message, /não é benchmark|não mede/);
    assert.equal(reason.budget.shareOfTotalPercent, rounded(reason.budget.lineTotal / result.totalEstimatedPrice * 100));
  }
  assert.match(explanation.selectionRule, /Não garante ótimo global/);
  assert.ok(explanation.compatibility.coolingWarnings.length, 'no selected cooler cannot turn into a fully verified cooling claim');
});

test('v3 one-part alternatives recompute whole-build compatibility, total and budget without mutating the proposal', () => {
  const result = recommend();
  const before = JSON.stringify(result.components);
  const alternatives = result.selectionExplanation.componentReasons.filter(reason => reason.alternative);
  assert.ok(alternatives.length > 0);
  for (const reason of alternatives) {
    const candidate = reason.alternative;
    const replacement = { ...result.components, [reason.slot]: findComponentById(candidate.componentId) };
    assert.equal(candidate.compatibilityStatus, 'compatible');
    assert.equal(evaluateResolvedBuildCompatibility(replacement).compatible, true);
    assert.equal(candidate.total, summarizeBuildPricing(replacement).estimatedTotal);
    assert.equal(candidate.priceDelta, rounded(candidate.total - result.totalEstimatedPrice));
    assert.equal(candidate.remainingBudget, rounded(10000 - candidate.total));
    assert.equal(candidate.withinBudget, candidate.total <= 10000);
    assert.match(candidate.message, /não um percentual de desempenho real/);
  }
  assert.equal(JSON.stringify(result.components), before);
});

test('v3 budget/profile changes regenerate facts even when a selected part remains the same', () => {
  const gaming = recommend(10000, 'gaming').selectionExplanation;
  const programming = recommend(8000, 'programming').selectionExplanation;
  assert.equal(gaming.budget.limit, 10000);
  assert.equal(programming.budget.limit, 8000);
  assert.equal(programming.budget.remaining, rounded(8000 - programming.budget.total));
  assert.equal(gaming.componentReasons.find(reason => reason.slot === 'gpu').profile.weight, 1.45);
  assert.equal(programming.componentReasons.find(reason => reason.slot === 'gpu').profile.weight, 1.1);
  assert.ok(programming.componentReasons.every(reason => reason.profile.usageType === 'programming'));
});

test('v3 range results include the same per-part evidence and disclose the exact requested interval', () => {
  const results = recommendBuildsByBudgetRange({ budgetRange: { min: 4000, max: 9000 }, usageType: 'study' });
  for (const result of results) {
    assert.equal(result.selectionExplanation.budget.min, 4000);
    assert.equal(result.selectionExplanation.budget.limit, 9000);
    assert.equal(result.selectionExplanation.budget.total, result.totalEstimatedPrice);
    assert.equal(result.selectionExplanation.componentReasons.length, 7);
    for (const reason of result.selectionExplanation.componentReasons.filter(reason => reason.alternative)) {
      assert.equal(reason.alternative.withinRange, reason.alternative.total >= 4000 && reason.alternative.total <= 9000);
    }
  }
});

test('v3 retained cooler and fan packs have full line costs, no fabricated score or thermal gain', () => {
  const components = { ...fixtureBuild(),
    cooler: { id: 'fixture-cooler', name: 'Fixture cooler', category: 'cooler', price: 250, specs: { supportedSockets: ['AM4'], coolingType: 'air', heightMm: 150, powerWatts: 2 } },
    fans: [{ id: 'fixture-fans', name: 'Fixture fans', category: 'fan', price: 90, quantity: 2, specs: { diameterMm: 120, thicknessMm: 25, unitsPerPack: 3, powerWatts: 1 } }] };
  const explain = selection => explainBuildSelection({ components: selection, budgetAmount: 1200,
    compatibility: evaluateResolvedBuildCompatibility(selection), selectionSource: 'current_selection' });
  const explanation = explain(components);
  assert.equal(explanation.budget.coolingSubtotal, 430);
  assert.equal(explanation.budget.total, 1130);
  assert.equal(explanation.budget.remaining, 70);
  const fans = explanation.componentReasons.find(reason => reason.slot === 'fans');
  assert.equal(fans.quantity, 2);
  assert.equal(fans.budget.unitPrice, 90);
  assert.equal(fans.budget.lineTotal, 180);
  assert.equal(fans.performance.score, null);
  assert.equal(fans.performance.basis, 'not_scored');
  assert.match(fans.performance.message, /Sem estimativa de ganho/);
  assert.equal(explanation.compatibility.status, 'unverified');
  const changed = explain({ ...components, fans: [{ ...components.fans[0], quantity: 3 }] });
  assert.equal(changed.budget.coolingSubtotal, 520);
  assert.equal(changed.budget.total, 1220);
  assert.equal(changed.budget.status, 'over_budget');
  assert.equal(changed.budget.remaining, -20);
});

test('v3 partial prices and unknown scores do not become zero-cost or verified-performance explanations', () => {
  const components = fixtureBuild();
  components.gpu.price = null;
  const explanation = explainBuildSelection({ components, budgetAmount: 1000,
    compatibility: evaluateResolvedBuildCompatibility(components), selectionSource: 'current_selection' });
  assert.equal(explanation.budget.total, null);
  assert.equal(explanation.budget.knownReferenceSubtotal, 600);
  assert.equal(explanation.budget.remaining, null);
  assert.equal(explanation.budget.status, 'unavailable');
  const gpu = explanation.componentReasons.find(reason => reason.slot === 'gpu');
  assert.equal(gpu.budget.lineTotal, null);
  assert.equal(gpu.budget.shareOfTotalPercent, null);
  assert.equal(gpu.performance.score, null);
  assert.match(gpu.performance.message, /Sem índice/);
  assert.match(gpu.budget.message, /Não trate o subtotal/);
  const comparison = compareRecommendedSelection(components, fixtureBuild(), new Map(), 'gaming');
  assert.equal(comparison.priceDelta, null);
  assert.equal(comparison.simulatedScoreDelta, null);
});

test('v3 explanations expose excluded BIOS/model candidates without claiming they are impossible in every build', () => {
  const result = recommend();
  const cpu = result.selectionExplanation.componentReasons.find(reason => reason.slot === 'cpu');
  const newCpu = cpu.excludedAlternatives.find(candidate => candidate.componentId === 'cpu-ryzen-7-7800x3d-box');
  assert.ok(newCpu);
  assert.ok(newCpu.reasons.some(reason => reason.code === 'CPU_BIOS_UNVERIFIED'));
  assert.ok(newCpu.facts.some(fact => fact.label === 'Núcleos' && fact.value === 8));
  assert.ok(newCpu.referencePrice > 0);
  assert.notEqual(newCpu.compatibilityStatus, 'compatible');
  assert.match(cpu.alternativeScope, /single_part_replacement/);
  const components = fixtureBuild();
  const missingModel = { ...components.gpu, id: 'fixture-unmodeled-gpu', price: 80 };
  const explanation = explainBuildSelection({ components, compatibility: evaluateResolvedBuildCompatibility(components),
    candidatesBySlot: { gpu: [missingModel] } });
  const rejected = explanation.componentReasons.find(reason => reason.slot === 'gpu').excludedAlternatives[0];
  assert.ok(rejected.reasons.some(reason => reason.code === 'PERFORMANCE_MODEL_UNAVAILABLE'));
  assert.equal(explanation.componentReasons.find(reason => reason.slot === 'gpu').alternative, null);
});

test('v3 incompatible, unknown and failed compatibility remain distinct in current-selection explanations', () => {
  const input = { build: currentBuild, budget: { amount: 10000 }, usageType: 'gaming' };
  const failed = createBuildSummaryGenerator({ compatibility: () => { throw new Error('test outage'); } })(input);
  assert.equal(failed.selectionExplanation.compatibility.status, 'unavailable');
  assert.ok(failed.selectionExplanation.componentReasons.every(reason => reason.compatibility.status === 'unavailable'));
  assert.ok(failed.selectionExplanation.componentReasons.every(reason => /Peça da sua montagem/.test(reason.selectionReason)));
  const incompatible = generateBuildSummary({ ...input, build: { ...currentBuild, cpuId: 'cpu-intel-i3-12100f' } });
  assert.equal(incompatible.selectionExplanation.compatibility.status, 'incompatible');
  const unknown = generateBuildSummary({ ...input, build: { ...currentBuild, cpuId: 'cpu-intel-i5-12400f', motherboardId: 'mb-msi-pro-h610m-s-ddr4' } });
  assert.equal(unknown.selectionExplanation.compatibility.status, 'unverified');
  assert.ok(unknown.selectionExplanation.compatibility.checks.some(check => check.code === 'CPU_BIOS_UNVERIFIED'));
  assert.equal(unknown.recommendationObservation.compatibilityStatus, 'compatible');
});

test('v3 summary alternative comparison reports actual changed slots and differences, not measured gains', () => {
  const result = generateBuildSummary({ build: currentBuild, budget: { amount: 10000 }, usageType: 'programming' });
  const recommended = result.recommendationObservation;
  assert.equal(recommended.comparison.currentTotal, result.totalEstimatedPrice);
  assert.equal(recommended.comparison.recommendedTotal, recommended.totalEstimatedPrice);
  assert.equal(recommended.comparison.priceDelta, rounded(recommended.totalEstimatedPrice - result.totalEstimatedPrice));
  assert.deepEqual(recommended.comparison.changedSlots, requiredBuildSlots.filter(slot => result.components[slot].id !== recommended.components[slot].id));
  assert.match(recommended.comparison.message, /não percentuais de desempenho nem FPS/);
});

test('v3 alternatives disclose an over-budget consequence instead of hiding it', () => {
  const components = fixtureBuild();
  const candidate = { ...components.gpu, id: 'fixture-more-expensive-gpu', price: 300 };
  const scoreParameters = new Map([[components.gpu.id, { performanceScore: 60 }], [candidate.id, { performanceScore: 70 }]]);
  const explanation = explainBuildSelection({ components, budgetAmount: 750, performanceByComponentId: scoreParameters,
    compatibility: evaluateResolvedBuildCompatibility(components), candidatesBySlot: { gpu: [candidate] } });
  const alternative = explanation.componentReasons.find(reason => reason.slot === 'gpu').alternative;
  assert.equal(alternative.priceDelta, 200);
  assert.equal(alternative.total, 900);
  assert.equal(alternative.withinBudget, false);
  assert.equal(alternative.scoreDelta, 10);
  assert.match(alternative.message, /Ultrapassa o limite/);
});

test('v3 candidate comparisons retain selected cooling and reject its unresolved fit', () => {
  const components = { ...fixtureBuild(), cooler: { id: 'fixture-cooler', name: 'Fixture cooler', category: 'cooler', price: 250,
    specs: { supportedSockets: ['AM4'], coolingType: 'air', heightMm: 150, powerWatts: 2 } } };
  const candidate = { ...components.gpu, id: 'fixture-cooling-gpu' };
  const explanation = explainBuildSelection({ components, budgetAmount: 2000,
    compatibility: evaluateResolvedBuildCompatibility(components), candidatesBySlot: { gpu: [candidate] },
    performanceByComponentId: new Map([[candidate.id, { performanceScore: 70 }]]) });
  const gpu = explanation.componentReasons.find(reason => reason.slot === 'gpu');
  assert.equal(gpu.alternative, null);
  assert.equal(gpu.excludedAlternatives[0].total, 950);
  assert.ok(gpu.excludedAlternatives[0].reasons.some(reason => reason.code === 'AIR_COOLER_CLEARANCE_UNVERIFIED'));
});

test('v3 every current catalog candidate is represented in direct-replacement comparison scope', () => {
  const result = recommend();
  for (const reason of result.selectionExplanation.componentReasons) {
    assert.equal(reason.comparedCandidates, listComponents({ type: reason.slot }).filter(component => component.id !== reason.componentId).length);
  }
  assert.ok(parameters().size > 0);
});

test('v3 study recommendation fits the attainable low budget without claiming application performance', () => {
  const result = recommendBuildByBudget({ budget: { amount: 5000, priority: 'lowest-price' }, usageType: 'study' });
  assert.ok(result.totalEstimatedPrice <= 5000);
  assert.equal(result.compatibilityStatus, 'compatible');
  assert.equal(result.components.gpu.id, 'gpu-msi-rtx-3050-lp-6g-oc');
  const gpu = result.selectionExplanation.componentReasons.find(reason => reason.slot === 'gpu');
  assert.match(gpu.selectionReason, /menor preço de referência/);
  assert.match(gpu.profile.message, /não usa a parcela de custo-benefício ponderada/);
  assert.match(gpu.profile.message, /não comprova desempenho/);
  assert.match(gpu.performance.message, /não é benchmark medido nem garantia de FPS/);
});
