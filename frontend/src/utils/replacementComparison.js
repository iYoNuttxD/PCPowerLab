// Compare only values returned for the paired verification request. Never reuse
// persisted simulations or infer FPS from a component's catalog score.
export function compareReplacementSummaries(before, after, settings = {}) {
  const beforePower = getPowerEstimate(before);
  const afterPower = getPowerEstimate(after);
  return {
    cost: compareMetric(before?.totalEstimatedPrice, after?.totalEstimatedPrice),
    power: {
      ...compareMetric(beforePower.value, afterPower.value, beforePower.complete && afterPower.complete),
      beforeComplete: beforePower.complete,
      afterComplete: afterPower.complete
    },
    performance: comparePerformance(before, after, settings)
  };
}

export function canApplyReplacement(summary) {
  return Boolean(summary?.components && summary.selectionStatus !== 'incomplete' && summary.available !== false);
}

function metric(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function compareMetric(beforeValue, afterValue, canCompare = true) {
  const before = metric(beforeValue);
  const after = metric(afterValue);
  const delta = canCompare && before !== null && after !== null
    ? Number((after - before).toFixed(2)) : null;
  return { before, after, delta };
}

function getPowerEstimate(summary) {
  const analysis = summary?.bottlenecks;
  const power = analysis?.performanceSummary;
  const value = analysis?.available === false || analysis?.status === 'unavailable'
    ? null : metric(power?.estimatedConsumptionWatts);
  const complete = value !== null && power?.powerEstimateComplete !== false
    && !(power?.unknownPowerComponents?.length > 0)
    && summary?.compatibility?.coolingPower?.complete !== false;
  return { value, complete };
}

function comparePerformance(beforeSummary, afterSummary, settings) {
  const before = beforeSummary?.gamePerformance;
  const after = afterSummary?.gamePerformance;
  const unavailable = reason => ({ comparable: false, before: null, after: null, delta: null, percentage: null, reason });
  const keys = ['gameId', 'targetResolution', 'qualityPreset'];
  if (keys.some(key => !settings[key])) return unavailable('missing-settings');
  if ([before, after].some(result => !result || result.available === false || result.status === 'unavailable' || metric(result.estimatedFps) === null)) {
    return unavailable('unavailable');
  }
  if (keys.some(key => !before[key] || !after[key])) return unavailable('unverified-settings');
  if (keys.some(key => before[key] !== after[key] || after[key] !== settings[key])) return unavailable('different-settings');
  const comparison = compareMetric(before.estimatedFps, after.estimatedFps);
  return {
    ...comparison,
    comparable: true,
    percentage: comparison.before > 0 ? Number((comparison.delta / comparison.before * 100).toFixed(2)) : null,
    game: after.game || before.game || settings.gameId,
    targetResolution: after.targetResolution,
    qualityPreset: after.qualityPreset,
    reason: null
  };
}
