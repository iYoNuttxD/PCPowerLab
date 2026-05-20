const defaultPerformanceScore = 50;

export function getEstimatedPrice(component) {
  const price = component?.estimatedPrice ?? component?.price;

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return price;
}

export function getPerformanceScore(component, performanceParameter, usageType = 'general') {
  if (!component) {
    return defaultPerformanceScore;
  }

  const usageScoreField = getUsageScoreField(usageType);
  const usageScore = performanceParameter?.[usageScoreField];
  const baseScore = performanceParameter?.performanceScore;

  if (Number.isFinite(usageScore)) {
    return usageScore;
  }

  if (Number.isFinite(baseScore)) {
    return baseScore;
  }

  return defaultPerformanceScore;
}

export function calculateCostBenefitScore(component, performanceParameter, options = {}) {
  const price = getEstimatedPrice(component);

  if (!price) {
    return 0;
  }

  const usageType = options.usageType || 'general';
  const slotWeight = options.slotWeight || 1;
  const performanceScore = getPerformanceScore(component, performanceParameter, usageType);
  const usageFitBonus = hasRecommendedUse(performanceParameter, usageType) ? 1.08 : 1;

  return (performanceScore * slotWeight * usageFitBonus) / price;
}

export function calculateBuildPerformanceScore(components, performanceByComponentId, usageType) {
  const entries = Object.values(components);

  if (entries.length === 0) {
    return 0;
  }

  const totalScore = entries.reduce((total, component) => {
    const performanceParameter = performanceByComponentId.get(component.id);

    return total + getPerformanceScore(component, performanceParameter, usageType);
  }, 0);

  return Number((totalScore / entries.length).toFixed(2));
}

function getUsageScoreField(usageType) {
  if (usageType === 'gaming') {
    return 'gamingScore';
  }

  if (usageType === 'streaming') {
    return 'gamingScore';
  }

  if (usageType === 'productivity' || usageType === 'work' || usageType === 'video-editing' || usageType === 'programming') {
    return 'productivityScore';
  }

  return 'performanceScore';
}

function hasRecommendedUse(performanceParameter, usageType) {
  if (!Array.isArray(performanceParameter?.recommendedUse)) {
    return false;
  }

  const aliasType = getUsageTypeAlias(usageType);

  return performanceParameter.recommendedUse.includes(aliasType);
}

function getUsageTypeAlias(usageType) {
  if (usageType === 'work' || usageType === 'productivity' || usageType === 'programming' || usageType === 'video-editing' || usageType === 'design') {
    return 'productivity';
  }

  if (usageType === 'streaming') {
    return 'gaming';
  }

  if (usageType === 'study' || usageType === 'upgrade') {
    return 'general';
  }

  return usageType;
}
