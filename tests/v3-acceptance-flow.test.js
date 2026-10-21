import test from 'node:test';
import assert from 'node:assert/strict';
import { currentBuild } from './helpers/current-build.js';
import { components } from '../src/data/components.mock.js';
import { selectBuildComponents } from '../src/services/build.service.js';
import { generateBuildSummary } from '../src/services/buildSummaryService.js';
import { getPurchaseLinksByBuild } from '../src/services/purchaseLinksService.js';
import { initialBuildState, readPersistedBuild } from '../frontend/src/utils/buildPersistence.js';
import { changeSelection, analyzedResults, replaceBuildComponent, undoBuildReplacement } from '../frontend/src/utils/buildTransitions.js';
import { buildToApiPayload, buildToPurchaseLinksPayload } from '../frontend/src/utils/buildHelpers.js';
import { wizardSteps } from '../frontend/src/utils/wizardSteps.js';

// Real catalog/services + state transitions, NOT a browser or HTTP E2E test.
function completeState() {
  let state = globalThis.structuredClone(initialBuildState);
  state.budget = { amount: 12000, currency: 'BRL', priority: 'cost-benefit' };
  state.usageType = 'study';
  const selected = selectBuildComponents(currentBuild);
  for (const slot of ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case']) {
    state = changeSelection(state, { ...state.selectedComponents, [slot]: selected[slot] });
  }
  return { ...state, wizardStep: 'review' };
}
function summarize(state) {
  return generateBuildSummary({ build: buildToApiPayload(state.selectedComponents), budget: state.budget, usageType: state.usageType });
}

test('V3 acceptance: budget/goal → seven real selections → back/forward → reload → independently available summary/shops', () => {
  assert.equal(wizardSteps[0], 'budget');
  let state = completeState();
  const expectedPayload = buildToApiPayload(state.selectedComponents);
  const originalRevision = state.revision;
  for (const wizardStep of ['cpu', 'budget', 'ram', 'review']) {
    state = { ...state, wizardStep };
    assert.deepEqual(buildToApiPayload(state.selectedComponents), expectedPayload);
    assert.equal(state.revision, originalRevision);
  }
  state = { ...state, ...analyzedResults(summarize(state)) };
  const restored = readPersistedBuild({ getItem: () => JSON.stringify(state) });
  assert.deepEqual(buildToApiPayload(restored.selectedComponents), expectedPayload);
  assert.deepEqual(restored.budget, state.budget);
  assert.equal(restored.usageType, 'study');
  assert.equal(restored.wizardStep, 'review');
  assert.equal(restored.summary, null, 'reload must not silently trust cached analyses');
  const refreshed = summarize(restored);
  assert.equal(refreshed.selectionStatus, 'complete');
  assert.equal(refreshed.pricing.referenceTotalComplete, true);
  assert.ok(refreshed.totalEstimatedPrice > 0);
  const shops = getPurchaseLinksByBuild(buildToPurchaseLinksPayload(restored.selectedComponents));
  assert.equal(Object.keys(shops).filter(slot => ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'].includes(slot)).length, 7);
});

test('V3 acceptance: one real storage swap recalculates the whole selection, preserves others, rejects stale result and undoes safely', () => {
  const state = completeState();
  const before = summarize(state);
  const alternative = components.filter(c => c.active !== false && c.category === 'storage' && c.id !== state.selectedComponents.storage.id)
    .map(component => ({ component, summary: summarize({ ...state, selectedComponents: { ...state.selectedComponents, storage: component } }) }))
    .find(({ component, summary }) => summary.compatibility.compatible === true && Number.isFinite(component.price) && summary.totalEstimatedPrice !== before.totalEstimatedPrice);
  assert.ok(alternative, 'fixture requires a real compatible differently-priced storage alternative');
  const { component, summary } = alternative;
  const replaced = replaceBuildComponent(state, 'storage', component, summary, state.revision);
  assert.equal(replaced.selectedComponents.storage.id, component.id);
  assert.equal(replaced.summary.totalEstimatedPrice, summary.totalEstimatedPrice);
  assert.equal(Number((summary.totalEstimatedPrice - before.totalEstimatedPrice).toFixed(2)), Number((component.price - state.selectedComponents.storage.price).toFixed(2)));
  for (const slot of ['cpu', 'gpu', 'motherboard', 'ram', 'psu', 'case']) assert.deepEqual(replaced.selectedComponents[slot], state.selectedComponents[slot]);
  assert.deepEqual(replaced.budget, state.budget);
  assert.equal(replaceBuildComponent(replaced, 'storage', state.selectedComponents.storage, before, state.revision), replaced);
  const undone = undoBuildReplacement(replaced);
  assert.deepEqual(buildToApiPayload(undone.selectedComponents), buildToApiPayload(state.selectedComponents));
  assert.deepEqual(undone.budget, state.budget);
  assert.equal(undone.summary, null);
  assert.equal(summarize(undone).totalEstimatedPrice, before.totalEstimatedPrice);
});
