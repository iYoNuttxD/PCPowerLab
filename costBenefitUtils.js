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

export function calculateRawCostBenefitRatio(performanceScore, price) {
  if (!Number.isFinite(performanceScore) || !Number.isFinite(price) || price <= 0) {
    return 0;
  }

  return performanceScore / price;
}

export function normalizeCostBenefitRatio(rawRatio, highestRatio) {
  if (!Number.isFinite(rawRatio) || !Number.isFinite(highestRatio) || highestRatio <= 0) {
    return 0;
  }

  const normalizedScore = (rawRatio / highestRatio) * 100;

  return Math.round(Math.min(100, Math.max(0, normalizedScore)));
}

export function classifyCostBenefitScore(costBenefitScore) {
  if (costBenefitScore >= 85) {
    return 'Excelente';
  }

  if (costBenefitScore >= 70) {
    return 'Muito bom';
  }

  if (costBenefitScore >= 55) {
    return 'Bom';
  }

  if (costBenefitScore >= 40) {
    return 'Regular';
  }

  return 'Baixo custo-benefício';
}

export function buildCostBenefitSummary({ component, performanceScore, costBenefitScore }) {
  const categoryLabel = getCategoryLabel(component.category);
  const classification = classifyCostBenefitScore(costBenefitScore).toLowerCase();

  if (costBenefitScore >= 85) {
    return `${component.name} apresenta custo-benefício excelente entre componentes da categoria ${categoryLabel}, combinando preço competitivo e performanceScore ${performanceScore}.`;
  }

  if (costBenefitScore >= 70) {
    return `${component.name} tem relação muito boa entre preço e desempenho dentro da categoria ${categoryLabel}.`;
  }

  if (costBenefitScore >= 55) {
    return `${component.name} entrega custo-benefício bom, mas há alternativas mais eficientes na mesma categoria.`;
  }

  if (costBenefitScore >= 40) {
    return `${component.name} possui custo-benefício regular para a categoria ${categoryLabel}.`;
  }

  return `${component.name} foi classificado como ${classification} quando comparado a componentes da mesma categoria.`;
}

function getCategoryLabel(category) {
  const labels = {
    cpu: 'processadores',
    gpu: 'placas de vídeo',
    motherboard: 'placas-mãe',
    ram: 'memórias RAM',
    storage: 'armazenamentos',
    psu: 'fontes',
    case: 'gabinetes'
  };

  return labels[category] ?? category;
}

