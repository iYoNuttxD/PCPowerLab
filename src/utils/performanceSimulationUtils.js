export const performanceSimulationWeights = {
  gpu: 0.5,
  cpu: 0.3,
  ram: 0.15,
  storage: 0.05
};

export const supportedQualityPresets = ['low', 'medium', 'high', 'ultra'];
export const supportedTargetResolutions = ['1080p', '1440p', '4k'];

const qualityPresetMultipliers = {
  low: 1.15,
  medium: 1,
  high: 0.9,
  ultra: 0.78
};

const resolutionMultipliers = {
  '1080p': 1,
  '1440p': 0.75,
  '4k': 0.55
};

const bottleneckSeverityMultipliers = {
  high: 0.85,
  medium: 0.93,
  low: 0.97
};

export function getRequirementStatus(score, minimumScore, recommendedScore) {
  if (score < minimumScore) {
    return 'belowMinimum';
  }

  if (score < recommendedScore) {
    return 'belowRecommended';
  }

  return 'recommended';
}

export function getRamRequirementStatus(capacityGb, minimumRamGb, recommendedRamGb) {
  if (capacityGb < minimumRamGb) {
    return 'belowMinimum';
  }

  if (capacityGb < recommendedRamGb) {
    return 'belowRecommended';
  }

  return 'recommended';
}

export function calculateWeightedPerformanceIndex({
  cpuScore,
  gpuScore,
  ramCapacityGb,
  storageScore,
  game
}) {
  const cpuIndex = normalizeRequirementRatio(cpuScore, game.recommendedCpuScore);
  const gpuIndex = normalizeRequirementRatio(gpuScore, game.recommendedGpuScore);
  const ramIndex = normalizeRequirementRatio(ramCapacityGb, game.recommendedRamGb);
  const storageIndex = normalizeRequirementRatio(storageScore, 80);

  return (
    (gpuIndex * performanceSimulationWeights.gpu)
    + (cpuIndex * performanceSimulationWeights.cpu)
    + (ramIndex * performanceSimulationWeights.ram)
    + (storageIndex * performanceSimulationWeights.storage)
  );
}

export function estimateFps({
  baseFpsReference,
  weightedPerformanceIndex,
  targetResolution,
  qualityPreset,
  bottleneckPenalty
}) {
  const fps = baseFpsReference
    * (weightedPerformanceIndex / 100)
    * resolutionMultipliers[targetResolution]
    * qualityPresetMultipliers[qualityPreset]
    * bottleneckPenalty;

  return Math.max(1, Math.round(fps));
}

export function getPerformanceLevel({ estimatedFps, meetsMinimumRequirements, meetsRecommendedRequirements }) {
  if (!meetsMinimumRequirements || estimatedFps < 30) {
    return 'insufficient';
  }

  if (meetsRecommendedRequirements && estimatedFps >= 60) {
    return 'excellent';
  }

  if (estimatedFps >= 50) {
    return 'good';
  }

  return 'basic';
}

export function getBottleneckPenalty(bottleneckAnalysis) {
  if (!bottleneckAnalysis?.hasBottleneck) {
    return 1;
  }

  if (bottleneckAnalysis.bottlenecks.some((bottleneck) => bottleneck.severity === 'high')) {
    return bottleneckSeverityMultipliers.high;
  }

  if (bottleneckAnalysis.bottlenecks.some((bottleneck) => bottleneck.severity === 'medium')) {
    return bottleneckSeverityMultipliers.medium;
  }

  return bottleneckSeverityMultipliers.low;
}

export function buildPerformanceSummaryMessage({
  gameName,
  qualityPreset,
  performanceLevel,
  meetsRecommendedRequirements
}) {
  const qualityLabel = { low: 'baixa', medium: 'média', high: 'alta', ultra: 'ultra' }[qualityPreset] || 'não informada';
  if (performanceLevel === 'insufficient') {
    return `A configuração não deve entregar desempenho mínimo satisfatório em ${gameName}.`;
  }

  if (performanceLevel === 'excellent') {
    return `A configuração deve rodar ${gameName} em qualidade ${qualityLabel} com desempenho ótimo.`;
  }

  if (performanceLevel === 'good' && !meetsRecommendedRequirements) {
    return `A configuração deve rodar ${gameName} em qualidade ${qualityLabel} com bom desempenho, mas abaixo do ideal recomendado.`;
  }

  if (performanceLevel === 'good') {
    return `A configuração deve rodar ${gameName} em qualidade ${qualityLabel} com bom desempenho.`;
  }

  return `A configuração deve rodar ${gameName}, mas com desempenho básico para a qualidade ${qualityLabel}.`;
}

export function getQualityPresetMultiplier(qualityPreset) {
  return qualityPresetMultipliers[qualityPreset];
}

export function getResolutionMultiplier(targetResolution) {
  return resolutionMultipliers[targetResolution];
}

function normalizeRequirementRatio(value, recommendedValue) {
  if (!Number.isFinite(value) || !Number.isFinite(recommendedValue) || recommendedValue <= 0) {
    return 0;
  }

  return Math.min((value / recommendedValue) * 100, 120);
}
