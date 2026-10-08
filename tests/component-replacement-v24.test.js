import test from 'node:test';
import assert from 'node:assert/strict';
import { components } from '../src/data/components.mock.js';
import { generateBuildSummary } from '../src/services/buildSummaryService.js';
import { saveBuild, getSavedBuildById } from '../src/services/savedBuildsService.js';
import { createSavedBuildVersion, getSavedBuildVersionById } from '../src/services/savedBuildVersionsService.js';
import { buildToApiPayload, hydrateBuildComponents, normalizeSavedBuildPayload } from '../frontend/src/utils/buildHelpers.js';
import { changeSelection, replaceBuildComponent, undoBuildReplacement, emptyResults } from '../frontend/src/utils/buildTransitions.js';
const find = id => components.find(item => item.id === id);
const ids = { cpu: 'cpu-ryzen-5-5600', motherboard: 'mb-b550m-aorus-elite', gpu: 'gpu-rtx-4060', ram: 'ram-kingston-fury-16gb-ddr4', storage: 'ssd-kingston-nv2-1tb', psu: 'psu-corsair-650w', case: 'case-mid-tower-airflow' };
const original = Object.fromEntries(Object.entries(ids).map(([type,id]) => [type, find(id)]));
const fixture = (cooling = false) => ({ selectedComponents: { ...original, ...(cooling ? { cooler: components.find(item => item.category === 'cooler'), fans: [{ ...components.find(item => item.category === 'fan'), quantity: 2 }] } : { fans: [] }) }, budget: { amount: 4600, currency: 'BRL', priority: 'cost-benefit' }, usageType: 'gaming', game: { gameId: 'game-cyberpunk-2077', targetResolution: '1080p', qualityPreset: 'high' }, revision: 0, replacementHistory: [], ...emptyResults });
const analyze = state => generateBuildSummary({ build: buildToApiPayload(state.selectedComponents), budget: state.budget, usageType: state.usageType, ...state.game });

test('v2.4 RTX 4060 → RX 7600 changes exactly GPU, preserving optional cooling and budget', () => {
  const before = fixture(true);
  const next = replaceBuildComponent(before, 'gpu', find('gpu-rx-7600'));
  for (const key of Object.keys(before.selectedComponents).filter(key => key !== 'gpu')) assert.strictEqual(next.selectedComponents[key], before.selectedComponents[key]);
  assert.strictEqual(next.budget, before.budget);
  assert.strictEqual(next.game, before.game);
  assert.equal(next.usageType, before.usageType);
  assert.equal(next.selectedComponents.gpu.id, 'gpu-rx-7600');
  assert.equal(next.revision, 1);
});

test('v2.4 recalculates cost, budget, power, performance and compatibility for only new selection', () => {
  const before = fixture();
  const after = replaceBuildComponent(before, 'gpu', find('gpu-rx-7600'));
  const oldSummary = analyze(before), newSummary = analyze(after);
  assert.equal(oldSummary.totalEstimatedPrice, 4699.3);
  assert.equal(newSummary.totalEstimatedPrice, 4499.3);
  assert.equal(newSummary.budgetStatus.status, 'within_budget');
  assert.equal(oldSummary.budgetStatus.status, 'near_budget');
  assert.equal(newSummary.compatibility.compatible, true);
  assert.notDeepEqual(newSummary.bottlenecks, oldSummary.bottlenecks);
  assert.equal(oldSummary.bottlenecks.performanceSummary.estimatedConsumptionWatts, 280);
  assert.equal(newSummary.bottlenecks.performanceSummary.estimatedConsumptionWatts, 330);
  assert.notEqual(newSummary.gamePerformance.estimatedFps, oldSummary.gamePerformance.estimatedFps);
  const committed = replaceBuildComponent(before, 'gpu', find('gpu-rx-7600'), newSummary, 0);
  assert.strictEqual(committed.summary, newSummary);
  assert.strictEqual(committed.gamePerformance, newSummary.gamePerformance);
  assert.equal(committed.recommendation, null);
});

test('v2.4 invalidates all analyses after a direct change and undo; successive undo restores only inputs', () => {
  const before = { ...fixture(), summary: { old: true }, recommendation: { old: true }, gamePerformance: { estimatedFps: 999 } };
  const first = replaceBuildComponent(before, 'gpu', find('gpu-rx-7600'));
  const second = replaceBuildComponent(first, 'cpu', find('cpu-ryzen-7-5700x'));
  for (const key of Object.keys(emptyResults)) assert.equal(second[key], null);
  const undo = undoBuildReplacement(second);
  assert.deepEqual(undo.selectedComponents, first.selectedComponents);
  const restored = undoBuildReplacement(undo);
  assert.deepEqual(restored.selectedComponents, before.selectedComponents);
  assert.equal(restored.gamePerformance, null);
  assert.equal(restored.revision, 4);
  assert.strictEqual(undoBuildReplacement(restored), restored);
});

test('v2.4 stale response cannot commit even after A → B → A; wrong category/no-op are rejected', () => {
  const before = fixture();
  const changed = replaceBuildComponent(before, 'gpu', find('gpu-rx-7600'));
  const restored = undoBuildReplacement(changed);
  assert.strictEqual(replaceBuildComponent(restored, 'gpu', find('gpu-rx-7600'), analyze(changed), before.revision), restored);
  assert.strictEqual(replaceBuildComponent(before, 'gpu', find(ids.cpu)), before);
  assert.strictEqual(replaceBuildComponent(before, 'gpu', find(ids.gpu)), before);
});

test('v2.4 incompatible CPU identifies affected socket without silently fixing motherboard', () => {
  const before = fixture();
  const candidate = replaceBuildComponent(before, 'cpu', find('cpu-ryzen-5-7600'));
  const report = analyze(candidate);
  assert.equal(report.compatibility.compatible, false);
  assert.ok(report.compatibility.alerts.some(alert => /socket/i.test(JSON.stringify(alert))));
  assert.strictEqual(candidate.selectedComponents.motherboard, before.selectedComponents.motherboard);
  assert.equal(report.gamePerformance.available, false);
});

test('v2.4 save and reload replacement preserve all accessories; original and version remain unchanged', () => {
  const before = fixture(true);
  const saved = saveBuild(normalizeSavedBuildPayload({ name: 'Original v2.4', ...before }));
  const version = createSavedBuildVersion(saved.id, { buildSnapshot: saved, reason: 'Before individual replacement' });
  const after = replaceBuildComponent(before, 'gpu', find('gpu-rx-7600'));
  const replacement = saveBuild(normalizeSavedBuildPayload({ name: 'Changed v2.4', ...after }));
  const map = Object.fromEntries(components.map(item => [item.id, item]));
  assert.deepEqual(buildToApiPayload(hydrateBuildComponents(getSavedBuildById(replacement.id).components, map)), buildToApiPayload(after.selectedComponents));
  assert.deepEqual(getSavedBuildVersionById(saved.id, version.id).buildSnapshot.components, saved.components);
  assert.equal(getSavedBuildById(saved.id).components.gpu, 'gpu-rtx-4060');
  const localReload = JSON.parse(JSON.stringify(after));
  assert.deepEqual(buildToApiPayload(undoBuildReplacement(localReload).selectedComponents), buildToApiPayload(before.selectedComponents));
});

test('v2.4 direct optional changes invalidate results and retain bounded undo history', () => {
  let state = fixture();
  for (let i = 0; i < 25; i++) state = changeSelection(state, { ...state.selectedComponents, fans: [] });
  assert.equal(state.replacementHistory.length, 20);
  assert.equal(state.revision, 25);
});

test('v2.4 verified commit rejects mismatched summaries and known incompatibility', () => {
  const state = fixture();
  const candidate = find('gpu-rx-7600');
  assert.strictEqual(replaceBuildComponent(state, 'gpu', candidate, analyze(state), 0), state);
  const changed = replaceBuildComponent(state, 'gpu', candidate);
  const summary = analyze(changed);
  assert.strictEqual(replaceBuildComponent(state, 'gpu', candidate, { ...summary, compatibility: { compatible: false, status: 'incompatible' } }, 0), state);
});

test('v2.4 higher-price replacement keeps the budget and exposes the exact overage', () => {
  const state = fixture();
  const candidate = find('gpu-rtx-4070');
  const after = replaceBuildComponent(state, 'gpu', candidate);
  const summary = analyze(after);
  const committed = replaceBuildComponent(state, 'gpu', candidate, summary, 0);
  assert.equal(committed.budget.amount, 4600);
  assert.equal(committed.summary.totalEstimatedPrice, 6699.3);
  assert.equal(committed.summary.budgetStatus.remaining, -2099.3);
  assert.equal(committed.summary.budgetStatus.status, 'over_budget');
});
