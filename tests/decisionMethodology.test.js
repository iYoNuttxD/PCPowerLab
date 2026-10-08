import { currentBuild } from './helpers/current-build.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { listComponentsByCostBenefit } from '../src/services/costBenefitService.js';
import { recommendBuildByBudget, recommendBuildsByBudgetRange } from '../src/services/recommendationService.js';
import { suggestUpgrades } from '../src/services/upgradeSuggestionService.js';
import { suggestCompatibilityFixes } from '../src/services/compatibilityFixService.js';
import { compareBuilds } from '../src/services/buildComparisonService.js';
import { getEstimatedPrice } from '../src/utils/costBenefitUtils.js';

const build = {
  cpuId: 'cpu-ryzen-5-5600', motherboardId: 'mb-b550m-aorus-elite',
  gpuId: 'gpu-rtx-4060', ramId: 'ram-kingston-fury-16gb-ddr4',
  storageId: 'ssd-kingston-nv2-1tb', psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

function assertDisclosure(result, scope) {
  const method = result.methodology;
  assert.equal(method.scope, scope);
  assert.equal(method.cost.basis, 'catalog_reference_estimate');
  assert.equal(method.cost.liveQuote, false);
  assert.equal(method.cost.includesShipping, false);
  assert.equal(method.performance.measuredBenchmark, false);
  assert.equal(method.specifications.basis, 'catalog_specs');
  assert.equal(method.compatibility.physicalValidation, false);
  assert.equal(method.value.marketWideComparison, false);
  assert.ok(method.value.ranking.length > 30);
}

test('value rankings retain legacy price and disclose category-normalized simulated value', () => {
  for (const entry of listComponentsByCostBenefit({ category: 'gpu' })) {
    assertDisclosure(entry, 'same_category_catalog_entries');
    assert.equal(entry.component.estimatedPrice, entry.component.price);
    assert.equal(entry.methodology.performance.fallbackScore, null);
    assert.ok(entry.component.specs);
    assert.match(entry.summary, /estimado|simulado|catalogo/);
  }
});

test('budget recommendations disclose candidate subset rather than market-wide cheapest claim', () => {
  const result = recommendBuildByBudget({ budget: { amount: 10000, priority: 'lowest-price' }, usageType: 'gaming' });
  assertDisclosure(result, 'shortlisted_catalog_candidates');
  assert.equal(typeof result.totalEstimatedPrice, 'number');
  assert.match(result.summary, /menor custo estimado entre as opções do catálogo/);
  assert.equal(result.summary.match(/entre as opções do catálogo/g)?.length, 1);
  const [range] = recommendBuildsByBudgetRange({ budgetRange: { min: 3000, max: 10000 }, usageType: 'gaming' });
  assertDisclosure(range, 'shortlisted_catalog_candidates');
});

test('upgrades and fixes disclose simulated costs and catalog-rule limitations', () => {
  const upgrades = suggestUpgrades({ build, budget: { amount: 1000 }, usageType: 'gaming' });
  assertDisclosure(upgrades, 'catalog_candidates');
  for (const suggestion of upgrades.suggestions) {
    assert.equal(suggestion.estimatedCostBasis, 'full_replacement_reference_price');
    assert.equal(suggestion.performanceBasis, 'simulated_score_difference');
    assert.ok(suggestion.estimatedUpgradeCost > 0);
  }
  const fixes = suggestCompatibilityFixes(build);
  assertDisclosure(fixes, 'catalog_candidates');
  assert.equal(fixes.methodology.performance.usedForRanking, false);
});

test('comparison limits its recommendation to submitted builds and preserves numerical totals', () => {
  const result = compareBuilds({ builds: [{ name: 'A', components: currentBuild }, { name: 'B', components: currentBuild }] });
  assertDisclosure(result, 'submitted_builds_only');
  assert.equal(result.builds[0].totalEstimatedPrice, result.builds[1].totalEstimatedPrice);
  assert.equal(result.builds[0].priceBasis, 'catalog_reference_estimate');
  assert.match(result.recommendedBuild.reason, /enviadas/);
});

test('unknown and invalid reference prices cannot represent a free upgrade', () => {
  for (const price of [null, undefined, 0, -1, NaN, Infinity]) {
    assert.equal(getEstimatedPrice({ price }), null);
  }
});
