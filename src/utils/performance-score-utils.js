export const bottleneckThresholds = {
  acceptableDifference: 15,
  moderateDifference: 30,
  minimumRamCapacityGb: 16,
  minimumRamSpeedMhz: 3000,
  minimumStorageScore: 55,
  minimumStorageReadSpeedMbS: 1000,
  psuAttentionHeadroomPercent: 15,
  baseSystemConsumptionWatts: 100
};

export function getScoreDifference(firstScore, secondScore) {
  return Math.abs(firstScore - secondScore);
}

export function getScoreDifferenceSeverity(difference) {
  if (difference > bottleneckThresholds.moderateDifference) {
    return 'high';
  }

  if (difference > bottleneckThresholds.acceptableDifference) {
    return 'medium';
  }

  return null;
}

export function getOverallBalance(bottlenecks) {
  if (bottlenecks.some((bottleneck) => bottleneck.severity === 'high')) {
    return 'critical';
  }

  if (bottlenecks.some((bottleneck) => bottleneck.severity === 'medium')) {
    return 'moderate';
  }

  if (bottlenecks.some((bottleneck) => bottleneck.severity === 'low')) {
    return 'attention';
  }

  return 'balanced';
}

export function calculateEstimatedConsumptionWatts(performanceParameters) {
  return [
    performanceParameters.cpu.tdp,
    performanceParameters.gpu.tdp,
    bottleneckThresholds.baseSystemConsumptionWatts
  ].reduce((total, value) => total + (Number(value) || 0), 0);
}
