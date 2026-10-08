import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePersistedBuild, readPersistedBuild, initialBuildState } from '../src/utils/buildPersistence.js';
import { hydrateBuildComponents, buildToApiPayload, calculateBuildPrice } from '../src/utils/buildHelpers.js';

test('null, primitive, array and corrupt storage restore usable defaults', () => {
  for (const value of [null, [], true, 8, 'old']) {
    assert.deepEqual(normalizePersistedBuild(value), initialBuildState);
  }
  assert.deepEqual(readPersistedBuild({ getItem: () => '{broken' }), initialBuildState);
  assert.deepEqual(readPersistedBuild({ getItem: () => { throw new Error('denied'); } }), initialBuildState);
});

test('partial legacy settings merge defaults and null nested settings cannot crash UI', () => {
  for (const value of [null, [], 3, 'invalid']) {
    const restored = normalizePersistedBuild({ budget: value, game: value, usageType: value });
    assert.deepEqual(restored.budget, initialBuildState.budget);
    assert.deepEqual(restored.game, initialBuildState.game);
    assert.equal(restored.usageType, 'gaming');
  }
  const restored = normalizePersistedBuild({ budget: { amount: 4000 }, game: { qualityPreset: 'medium' } });
  assert.deepEqual(restored.budget, { ...initialBuildState.budget, amount: 4000 });
  assert.deepEqual(restored.game, { ...initialBuildState.game, qualityPreset: 'medium' });
});

test('malformed entries no longer discard the entire otherwise valid saved selection', () => {
  const restored = normalizePersistedBuild({ selectedComponents: {
    cpuId: 'cpu-legacy', fans: [null, {}, 'bad', { id: 12 }, { id: 'invalid', quantity: -1 }, { fanId: 'fan-ok', quantity: 2, price: 25 }]
  }, replacementHistory: [null, [], { cpuId: 'cpu-before' }] });
  assert.equal(restored.selectedComponents.cpu.id, 'cpu-legacy');
  assert.deepEqual(buildToApiPayload(restored.selectedComponents).fans, [{ fanId: 'fan-ok', quantity: 2 }]);
  assert.equal(restored.replacementHistory.length, 1);
  assert.equal(restored.replacementHistory[0].cpu.id, 'cpu-before');
  assert.deepEqual(hydrateBuildComponents(null), { fans: [] });
  assert.equal(calculateBuildPrice({ fans: restored.selectedComponents.fans }), 50);
});

test('unverified cached analyses and injected state fields are not restored', () => {
  const restored = normalizePersistedBuild({ revision: -9, summary: { success: true }, compatibility: { compatible: true }, actions: 'bad', budget: { amount: false } });
  assert.equal(restored.summary, null);
  assert.equal(restored.compatibility, null);
  assert.equal(restored.actions, undefined);
  assert.equal(restored.revision, 0);
  assert.equal(restored.budget.amount, '');
});


test('ready-build cost-benefit and high-performance profiles survive reload', () => {
  for (const usageType of ['cost-benefit', 'high-performance']) {
    assert.equal(normalizePersistedBuild({ usageType }).usageType, usageType);
  }
});
