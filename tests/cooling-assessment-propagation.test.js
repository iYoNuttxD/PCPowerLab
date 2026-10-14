import test from 'node:test';
import assert from 'node:assert/strict';
import { currentBuild } from './helpers/current-build.js';
import { compareBuilds } from '../src/services/buildComparisonService.js';
import { suggestUpgrades } from '../src/services/upgradeSuggestionService.js';
import { generateUpgradeRoadmap } from '../src/services/upgradeRoadmapService.js';
import { previewCatalogCompatibility } from '../src/services/catalogCompatibilityService.js';
import { suggestCompatibilityFixes } from '../src/services/compatibilityFixService.js';
import { calculateBuildScore } from '../src/services/buildScoreService.js';
import { exportBuildToJson } from '../src/services/buildExportService.js';
import { validateSimulationCompatibility } from '../src/services/simulationCompatibilityService.js';
import { createRecommendationFeedback, deleteRecommendationFeedback } from '../src/services/recommendationFeedbackService.js';
const scoped = value => assert.equal(value?.status, 'unverified');

test('comparison and catalog verdicts retain cooling qualification', () => {
  const result = compareBuilds({ builds: [{ name: 'One', components: currentBuild }, { name: 'Two', components: currentBuild }] });
  for (const build of result.builds) {
    assert.equal(build.compatible, true);
    scoped(build.coolingAssessment);
    assert.match(build.summary, /refrigeração não verificada/);
  }
  const previews = previewCatalogCompatibility(currentBuild, 'cpu');
  assert.ok(previews.length > 0);
  for (const preview of previews) scoped(preview.coolingAssessment);
});
test('real upgrade results and every roadmap step retain assessment without disappearing', () => {
  const upgrades = suggestUpgrades({ build: currentBuild, budget: { amount: 10000 }, usageType: 'gaming' });
  assert.ok(upgrades.suggestions.length > 0);
  for (const suggestion of upgrades.suggestions) scoped(suggestion.coolingAssessment);
  const roadmap = generateUpgradeRoadmap({ build: currentBuild, totalBudget: 10000 });
  scoped(roadmap.initialCompatibility.coolingAssessment);
  assert.ok(roadmap.steps.length > 0);
  for (const step of roadmap.steps) scoped(step.compatibilityAfterStep.coolingAssessment);
});
test('fixes, score, simulation and exported summary serialize scoped uncertainty', () => {
  scoped(suggestCompatibilityFixes(currentBuild).coolingAssessment);
  scoped(calculateBuildScore({ build: currentBuild }).source.coolingAssessment);
  scoped(validateSimulationCompatibility(currentBuild).coolingAssessment);
  scoped(exportBuildToJson({ build: currentBuild, includeSummary: true }).summary.coolingAssessment);
});
test('feedback assessment is derived from snapshot, not a client claim', t => {
  const feedback = createRecommendationFeedback({ recommendationType: 'ready-build', rating: 4,
    buildSnapshot: currentBuild, coolingAssessment: { status: 'compatible' } });
  t.after(() => deleteRecommendationFeedback(feedback.id));
  scoped(feedback.coolingAssessment);
  assert.deepEqual(feedback.buildSnapshot, currentBuild);
  const partial = createRecommendationFeedback({ recommendationType: 'general', rating: 4, buildSnapshot: { cpuId: 'missing' } });
  t.after(() => deleteRecommendationFeedback(partial.id));
  scoped(partial.coolingAssessment);
  assert.equal(partial.coolingAssessment.unverifiedChecks[0].code, 'COOLING_SNAPSHOT_UNVERIFIED');
});

test('saved-build revalidation retains scoped cooling uncertainty', async t => {
  const { saveBuild, deleteSavedBuild } = await import('../src/services/savedBuildsService.js');
  const { revalidateSavedBuild } = await import('../src/services/savedBuildRevalidationService.js');
  const saved = saveBuild({ name: 'Cooling revalidation fixture', components: currentBuild });
  t.after(() => deleteSavedBuild(saved.id));
  const result = revalidateSavedBuild(saved.id).results[0];
  assert.equal(result.status, 'compatible');
  scoped(result.coolingAssessment);
});
