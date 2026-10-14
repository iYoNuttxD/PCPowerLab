import test from 'node:test';
import assert from 'node:assert/strict';
import { canApplyReplacement, compareReplacementSummaries } from '../src/utils/replacementComparison.js';

const settings = { gameId: 'game-example', targetResolution: '1080p', qualityPreset: 'high' };
const summary = (overrides = {}) => ({
  totalEstimatedPrice: 4000.1,
  compatibility: { compatible: true, status: 'compatible', alerts: [] },
  bottlenecks: { performanceSummary: { estimatedConsumptionWatts: 320 } },
  gamePerformance: { ...settings, game: 'Jogo de teste', estimatedFps: 60 },
  ...overrides
});

test('compares returned whole-build price, power and same-setting game estimates', () => {
  const before = summary();
  const after = summary({
    totalEstimatedPrice: 4350.4,
    bottlenecks: { performanceSummary: { estimatedConsumptionWatts: 350 } },
    gamePerformance: { ...settings, game: 'Jogo de teste', estimatedFps: 75 }
  });
  const original = structuredClone({ before, after });
  const result = compareReplacementSummaries(before, after, settings);
  assert.deepEqual(result.cost, { before: 4000.1, after: 4350.4, delta: 350.3 });
  assert.equal(result.power.delta, 30);
  assert.equal(result.performance.before, 60);
  assert.equal(result.performance.after, 75);
  assert.equal(result.performance.delta, 15);
  assert.equal(result.performance.percentage, 25);
  assert.equal(result.performance.comparable, true);
  assert.deepEqual({ before, after }, original, 'comparison never mutates either summary');
});

test('shows decreases and genuine zero changes without converting missing metrics into zero', () => {
  const result = compareReplacementSummaries(summary(), summary({ totalEstimatedPrice: 3900.1 }), settings);
  assert.equal(result.cost.delta, -100);
  assert.equal(result.power.delta, 0);
  assert.equal(result.performance.delta, 0);
  const zero = compareReplacementSummaries(summary({ gamePerformance: { ...settings, estimatedFps: 0 } }), summary(), settings);
  assert.equal(zero.performance.before, 0);
  assert.equal(zero.performance.delta, 60);
  assert.equal(zero.performance.percentage, null, 'zero baseline has no finite percentage increase');
});

test('accepts numeric API strings but rejects absent, non-finite, negative and coerced values', () => {
  const valid = compareReplacementSummaries(summary({ totalEstimatedPrice: '3000' }), summary(), settings);
  assert.equal(valid.cost.before, 3000);
  for (const value of [null, undefined, '', ' ', false, true, [], {}, NaN, Infinity, -1, 'invalid']) {
    const result = compareReplacementSummaries(summary({
      totalEstimatedPrice: value,
      bottlenecks: { performanceSummary: { estimatedConsumptionWatts: value } },
      gamePerformance: { ...settings, estimatedFps: value }
    }), summary(), settings);
    assert.equal(result.cost.before, null);
    assert.equal(result.cost.delta, null);
    assert.equal(result.power.before, null);
    assert.equal(result.power.delta, null);
    assert.equal(result.performance.comparable, false);
    assert.equal(result.performance.delta, null);
  }
});

test('missing baseline leaves candidate metrics available without fabricated differences', () => {
  const result = compareReplacementSummaries(null, summary(), settings);
  assert.deepEqual(result.cost, { before: null, after: 4000.1, delta: null });
  assert.equal(result.power.before, null);
  assert.equal(result.power.after, 320);
  assert.equal(result.power.delta, null);
  assert.equal(result.performance.comparable, false);
  assert.equal(canApplyReplacement(summary()), true);
});

test('requires all selected game settings and all returned settings before showing FPS', () => {
  for (const key of Object.keys(settings)) {
    const incompleteSettings = { ...settings, [key]: undefined };
    assert.equal(compareReplacementSummaries(summary(), summary(), incompleteSettings).performance.reason, 'missing-settings');
    const incompleteResult = summary({ gamePerformance: { ...settings, [key]: undefined, estimatedFps: 75 } });
    assert.equal(compareReplacementSummaries(summary(), incompleteResult, settings).performance.reason, 'unverified-settings');
  }
});

test('never compares FPS from a different game, resolution or quality or from old request settings', () => {
  for (const key of Object.keys(settings)) {
    const different = summary({ gamePerformance: { ...settings, [key]: 'different', estimatedFps: 75 } });
    const pairMismatch = compareReplacementSummaries(summary(), different, settings).performance;
    assert.equal(pairMismatch.reason, 'different-settings');
    assert.equal(pairMismatch.before, null);
    assert.equal(pairMismatch.after, null);
    assert.equal(pairMismatch.delta, null);
    assert.equal(compareReplacementSummaries(different, different, settings).performance.reason, 'different-settings');
  }
});

test('unavailable analyses cannot leak leftover numeric FPS or power values', () => {
  for (const unavailable of [{ available: false }, { status: 'unavailable' }]) {
    const result = compareReplacementSummaries(summary(), summary({
      bottlenecks: { ...unavailable, performanceSummary: { estimatedConsumptionWatts: 300 } },
      gamePerformance: { ...settings, estimatedFps: 90, ...unavailable }
    }), settings);
    assert.equal(result.power.after, null);
    assert.equal(result.power.delta, null);
    assert.equal(result.performance.comparable, false);
    assert.equal(result.performance.after, null);
  }
});

test('partial cooling consumption remains explicitly partial and suppresses the power delta', () => {
  const partialSummaries = [
    summary({ bottlenecks: { performanceSummary: { estimatedConsumptionWatts: 330, powerEstimateComplete: false } } }),
    summary({ bottlenecks: { performanceSummary: { estimatedConsumptionWatts: 330, unknownPowerComponents: ['fan'] } } }),
    summary({ compatibility: { compatible: false, status: 'unverified', coolingPower: { complete: false } } })
  ];
  for (const partial of partialSummaries) {
    const result = compareReplacementSummaries(summary(), partial, settings);
    assert.equal(result.power.beforeComplete, true);
    assert.equal(result.power.afterComplete, false);
    assert.notEqual(result.power.after, null);
    assert.equal(result.power.delta, null);
    assert.equal(compareReplacementSummaries(partial, summary(), settings).power.delta, null);
  }
});

test('unverified optional cooling permits an explicit apply but never implies verified FPS', () => {
  const pending = summary({ compatibility: {
    compatible: false, status: 'unverified',
    unverifiedChecks: [{ code: 'AIR_COOLER_CLEARANCE_UNVERIFIED', message: 'Confirme as folgas no manual.' }],
    alerts: [{ code: 'AIR_COOLER_CLEARANCE_UNVERIFIED', severity: 'medium', blocking: false }]
  } });
  assert.equal(canApplyReplacement(pending), true);
  assert.equal(compareReplacementSummaries(pending, pending, settings).performance.comparable, false);
  assert.equal(compareReplacementSummaries(pending, pending, settings).performance.reason, 'unverified-compatibility');
  assert.equal(pending.compatibility.compatible, false);
  assert.equal(pending.compatibility.status, 'unverified');
});

test('known incompatibilities block apply and suppress performance comparisons even with conflicting success flags', () => {
  const incompatible = [
    { compatible: false, status: 'incompatible', alerts: [] },
    { compatible: true, status: 'incompatible', alerts: [] },
    { compatible: true, alerts: [{ severity: 'high' }] },
    { compatible: false, status: 'unverified', violations: [{ blocking: true }] },
    { compatible: true, issues: [{ severity: 'critical' }] },
    { compatible: false, alerts: [] }
  ];
  for (const compatibility of incompatible) {
    const blocked = summary({ compatibility });
    assert.equal(canApplyReplacement(blocked), false);
    assert.equal(compareReplacementSummaries(summary(), blocked, settings).performance.reason, 'incompatible-build');
  }
  assert.equal(canApplyReplacement(null), false);
  assert.equal(canApplyReplacement({}), false);
});

test('ordinary warnings do not pretend to be critical incompatibilities', () => {
  assert.equal(canApplyReplacement(summary({ compatibility: { compatible: true, alerts: [{ severity: 'medium', blocking: false }] } })), true);
});
