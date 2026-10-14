import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { currentBuild } from './helpers/current-build.js';
import { recommendBuildByBudget, recommendBuildsByBudgetRange } from '../src/services/recommendationService.js';
import { listReadyBuilds } from '../src/services/readyBuildsService.js';
import { readyBuilds } from '../src/data/readyBuilds.js';
import { generateBuildSummary } from '../src/services/buildSummaryService.js';
import { checkCoolingCompatibility } from '../src/services/cooling.service.js';

function assertScoped(assessment) {
  assert.equal(assessment.status, 'unverified');
  assert.equal(assessment.scope, 'cooling_not_assessed');
  assert.ok(assessment.unverifiedChecks.some(issue => issue.code === 'CPU_COOLING_FIT_UNVERIFIED'));
}
test('unknown stock cooling stays explicit without removing ready presets or forcing purchases', () => {
  const presets = listReadyBuilds();
  assert.deepEqual(presets.map(build => build.id), readyBuilds.map(build => build.id));
  for (const preset of presets) {
    assert.equal(preset.compatibility.compatible, true);
    assertScoped(preset.compatibility.coolingAssessment);
    assert.equal(preset.components.coolerId, undefined);
  }
  const recommendation = recommendBuildByBudget({ budget: { amount: 10000 }, usageType: 'gaming' });
  assertScoped(recommendation.coolingAssessment);
  assert.equal(recommendation.components.cooler, undefined);
  const range = recommendBuildsByBudgetRange({ budgetRange: { min: 3500, max: 10000 }, usageType: 'gaming' });
  assert.ok(range.length > 0);
  for (const result of range) assertScoped(result.coolingAssessment);
  assertScoped(generateBuildSummary({ build: currentBuild }).compatibility.coolingAssessment);
});
test('compatibility HTTP serialization retains scoped uncertainty and seven selected slots', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  for (const route of ['check', 'alerts']) {
    const response = await globalThis.fetch(`http://127.0.0.1:${server.address().port}/api/v1/compatibility/${route}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(currentBuild)
    });
    assert.equal(response.status, 200);
    const { data } = await response.json();
    assert.equal(data.compatible, true);
    assertScoped(data.coolingAssessment);
    assert.equal(Object.keys(data.selectedComponents).length, 7);
  }
});
test('known absence of boxed cooler and absent stock identity have precise scoped warnings', () => {
  const result = checkCoolingCompatibility({ cpu: { specs: { includesCpuCooler: false } } });
  assertScoped(result.coolingAssessment);
  assert.match(result.coolingAssessment.unverifiedChecks[0].message, /não inclui cooler/);
  assert.deepEqual(result.unverifiedChecks, []);
});
test('incomplete stock specifications remain scoped uncertainty rather than an invented fit', () => {
  const result = checkCoolingCompatibility({ cpu: { specs: { includesCpuCooler: true,
    includedCpuCooler: { name: 'Unknown-height stock', specSourceUrl: 'https://manufacturer.example/fixture', specs: { coolingType: 'air' } }
  } } });
  assertScoped(result.coolingAssessment);
  assert.deepEqual(result.unverifiedChecks, []);
});
