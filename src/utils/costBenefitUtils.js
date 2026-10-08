import { requiredBuildSlots } from '../services/build.service.js';

const defaultPerformanceScore = 50;

export function getEstimatedPrice(component) {
  const price = component?.estimatedPrice ?? component?.price;

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return price;
}

export function getPerformanceScore(component, performanceParameter, usageType = 'general') {
  if (['cooler', 'fan'].includes(component?.category)) {
    return 0;
  }

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
  const entries = requiredBuildSlots.map((slot) => components[slot]).filter(Boolean);

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


export function classifyCostBenefitScore(score) {
  if (score >= 85) {
    return 'Excelente';
  }

  if (score >= 70) {
    return 'Muito bom';
  }

  if (score >= 55) {
    return 'Bom';
  }

  if (score >= 40) {
    return 'Regular';
  }

  return 'Baixo custo-benefício';
}

export function buildCostBenefitSummary(component, score) {
  const categoryLabel = getCategoryLabel(component?.category);
  if (score >= 85) {
    return `Excelente relação entre preço e desempenho para ${categoryLabel}.`;
  }

  if (score >= 70) {
    return `Boa relação entre preço e desempenho para ${categoryLabel}.`;
  }

  if (score >= 55) {
    return `Relação equilibrada entre preço e desempenho para ${categoryLabel}.`;
  }

  if (score >= 40) {
    return `Custo-benefício regular para ${categoryLabel}; compare com alternativas da mesma categoria.`;
  }

  return `Baixo custo-benefício para ${categoryLabel}, considerando preço e desempenho informados.`;
}

function getCategoryLabel(category) {
  const labels = {
    cpu: 'processadores',
    gpu: 'placas de vídeo',
    motherboard: 'placas-mãe',
    ram: 'memórias RAM',
    storage: 'armazenamento',
    psu: 'fontes',
    case: 'gabinetes'
  };

  return labels[category] || 'componentes desta categoria';
}
