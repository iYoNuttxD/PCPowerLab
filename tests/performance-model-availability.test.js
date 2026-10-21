import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { components } from '../src/data/components.mock.js';
import { performanceParameters } from '../src/data/performanceParameters.js';
import { getPerformanceScore, calculateCostBenefitScore, calculateBuildPerformanceScore } from '../src/utils/costBenefitUtils.js';
import { calculateBuildScore } from '../src/services/buildScoreService.js';
import { compareBuilds } from '../src/services/buildComparisonService.js';
import { listComponentsByCostBenefit } from '../src/services/costBenefitService.js';
import { recommendBuildByBudget } from '../src/services/recommendationService.js';
import { suggestUpgrades } from '../src/services/upgradeSuggestionService.js';
import { simulateGamePerformance, compareGamePerformance } from '../src/services/gamePerformanceService.js';
import { simulateProfessionalSoftwarePerformance, listProfessionalSoftware } from '../src/services/professionalSoftwareService.js';
import { analyzeBuildBottlenecks } from '../src/services/bottleneck.service.js';
import { selectBuildComponents, serializeBuildSelection } from '../src/services/build.service.js';
import { listComponents } from '../src/services/component.service.js';
import { generateBuildReport } from '../src/services/buildReportService.js';
import { exportBuildToJson } from '../src/services/buildExportService.js';

test('missing processing parameters use bounded explicit approximations rather than a simulation gate', () => {
  for (const category of ['cpu', 'gpu', 'ram', 'storage']) {
    const component = { id: `missing-${category}`, category, price: 100 };
    const score = getPerformanceScore(component, null);
    assert.ok(Number.isFinite(score) && score >= 0 && score <= 100);
    assert.ok(Number.isFinite(calculateCostBenefitScore(component, null)));
    assert.ok(Number.isFinite(calculateBuildPerformanceScore({ [category]: component }, new Map(), 'general')));
  }
  assert.equal(getPerformanceScore({ category: 'psu' }, null), 50);
});

const originals = { cpu: 'cpu-ryzen-5-5600', motherboard: 'mb-b550m-aorus-elite', gpu: 'gpu-rtx-4060', ram: 'ram-kingston-fury-16gb-ddr4', storage: 'ssd-kingston-nv2-1tb', psu: 'psu-corsair-650w', case: 'case-mid-tower-airflow' };
const build = Object.fromEntries(Object.keys(originals).map(slot => [`${slot}Id`, `calibration-test-${slot}`]));
const unavailableId = 'calibration-test-unavailable-gpu';
const unknownBuild = { ...build, gpuId: unavailableId };
const prefix = 'calibration-test-';
const cloneRecord = value => JSON.parse(JSON.stringify(value));
before(() => {
  for (const [slot, originalId] of Object.entries(originals)) {
    const source = components.find(component => component.id === originalId);
    const clone = cloneRecord(source);
    Object.assign(clone, { id: build[`${slot}Id`], active: true, lifecycle: 'active', price: 500, priceKind: 'estimated-reference' });
    delete clone.datedReferenceIdentity;
    delete clone.estimatedPrice;
    components.push(clone);
    const parameter = performanceParameters.find(parameter => parameter.componentId === originalId);
    if (parameter) performanceParameters.push({ ...cloneRecord(parameter), componentId: clone.id });
  }
  components.push({ ...cloneRecord(components.find(component => component.id === build.gpuId)), id: unavailableId, price: 1, performanceModelStatus: 'unavailable' });
});
after(() => {
  for (let i = components.length - 1; i >= 0; i--) if (components[i].id.startsWith(prefix)) components.splice(i, 1);
  for (let i = performanceParameters.length - 1; i >= 0; i--) if (performanceParameters[i].componentId.startsWith(prefix)) performanceParameters.splice(i, 1);
});

const assertRange = result => {
  assert.equal(result.available, true);
  assert.ok(Number.isFinite(result.estimatedFps));
  assert.ok(result.estimatedFpsRange.low <= result.estimatedFps && result.estimatedFpsRange.high >= result.estimatedFps);
  assert.equal(result.estimation.measuredBenchmark, false);
};
test('missing exact calibration remains labeled while summaries, scores and exports stay useful', () => {
  const selected = selectBuildComponents(unknownBuild);
  assert.equal(selected.gpu.id, unavailableId);
  assert.equal(serializeBuildSelection(selected).gpu, unavailableId);
  assert.ok(Number.isFinite(listComponents({ category: 'gpu' }).find(c => c.id === unavailableId).performanceScore));
  const score = calculateBuildScore({ build: unknownBuild, budget: { amount: 5000 } });
  assert.ok(Number.isFinite(score.criteria.performanceScore));
  assert.ok(Number.isFinite(score.overallScore));
  assertRange(simulateGamePerformance({ build: unknownBuild, gameId:'game-valorant' }));
  assert.ok(JSON.stringify(exportBuildToJson({ build: unknownBuild, includeSummary:true })).includes(unavailableId));
});
test('approximate models participate in recommendations, comparisons, value rankings and upgrades without false measured claims', () => {
  const recommendation = recommendBuildByBudget({ budget:{amount:8000}, usageType:'gaming' });
  assert.ok(recommendation.totalEstimatedPrice <= 8000);
  assert.ok(Number.isFinite(listComponentsByCostBenefit({ category:'gpu' }).find(item => item.component.id === unavailableId).performanceScore));
  const compared = compareBuilds({ builds:[{build:unknownBuild},{build}], comparisonCriteria:'performance' });
  assert.ok(compared.builds.every(entry => Number.isFinite(entry.performanceScore)));
  const upgrades = suggestUpgrades({ build:unknownBuild, budget:{amount:5000} });
  assert.ok(upgrades.suggestions.every(item => Number.isFinite(item.scoreGain)));
});
test('missing model produces game, multi-game, software and bottleneck scenarios', () => {
  assertRange(simulateGamePerformance({build:unknownBuild,gameId:'game-valorant'}));
  for (const result of compareGamePerformance({build:unknownBuild,gameIds:['game-valorant','game-cyberpunk-2077']}).results) assertRange(result);
  const software = simulateProfessionalSoftwarePerformance({build:unknownBuild,softwareId:listProfessionalSoftware()[0].id});
  assert.equal(software.available,true);
  assert.equal(software.estimation.measuredBenchmark,false);
  assert.ok(Number.isFinite(software.performanceScore));
  assert.equal(typeof analyzeBuildBottlenecks(unknownBuild).hasBottleneck,'boolean');
});
test('an explicit RAM model gap preserves factual capacity and theoretical results', () => {
  const ram = components.find(c => c.id === build.ramId);
  ram.performanceModelStatus='unavailable';
  try {
    assert.ok(Number.isFinite(getPerformanceScore(ram, performanceParameters.find(p => p.componentId === ram.id))));
    assertRange(simulateGamePerformance({build,gameId:'game-valorant'}));
    assert.equal(selectBuildComponents(build).ram.specs.capacityGb,ram.specs.capacityGb);
  } finally { delete ram.performanceModelStatus; }
});
for (const slot of ['ram','storage']) for (const failure of ['missing','invalid-score','wrong-type']) {
  test(`${slot} ${failure} parameter uses safe fallback across outputs without corrupting facts`, () => {
    const id=build[`${slot}Id`], index=performanceParameters.findIndex(p => p.componentId===id), original=performanceParameters[index];
    const facts=globalThis.structuredClone(components.find(c=>c.id===id).specs);
    if(failure==='missing') performanceParameters.splice(index,1);
    else performanceParameters[index]={...original,...(failure==='wrong-type'?{type:'cpu'}:{performanceScore:NaN})};
    try {
      assertRange(simulateGamePerformance({build,gameId:'game-valorant'}));
      const score=calculateBuildScore({build,budget:{amount:5000}});
      assert.ok(Number.isFinite(score.overallScore));
      const compared=compareBuilds({builds:[{build},{build}],comparisonCriteria:'performance'});
      assert.ok(compared.builds.every(entry=>Number.isFinite(entry.performanceScore)));
      assert.equal(simulateProfessionalSoftwarePerformance({build,softwareId:listProfessionalSoftware()[0].id}).available,true);
      assert.equal(analyzeBuildBottlenecks(build).available,true);
      assert.equal(typeof generateBuildReport({build}).bottlenecks.hasBottleneck,'boolean');
      assert.ok(JSON.stringify(exportBuildToJson({build,includeSummary:true})).includes(id));
      assert.deepEqual(components.find(c=>c.id===id).specs,facts);
    } finally { if(failure==='missing') performanceParameters.splice(index,0,original);else performanceParameters[index]=original; }
  });
}
