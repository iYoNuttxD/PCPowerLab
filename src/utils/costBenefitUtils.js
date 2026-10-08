import { corePerformanceCategories, isValidCorePerformanceParameter } from './performanceAvailability.js';
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
  if (!component || component.performanceModelStatus === 'unavailable') {
    return null;
  }

  if (['cooler', 'fan'].includes(component.category)) {
    return 0;
  }

  if (corePerformanceCategories.includes(component.category) && !isValidCorePerformanceParameter(component, performanceParameter)) return null;

  const usageScoreField = getUsageScoreField(usageType);
  const usageScore = performanceParameter?.[usageScoreField];
  const baseScore = performanceParameter?.performanceScore;

  if (Number.isFinite(usageScore)) {
    return usageScore;
  }

  if (Number.isFinite(baseScore)) {
    return baseScore;
  }

  return ['cpu', 'gpu', 'ram', 'storage'].includes(component.category) ? null : defaultPerformanceScore;
}

export function calculateCostBenefitScore(component, performanceParameter, options = {}) {
  const performanceScore = getPerformanceScore(component, performanceParameter, options.usageType || 'general');
  if (performanceScore === null) return null;
  const price = getEstimatedPrice(component);

  if (!price) {
    return 0;
  }

  const usageType = options.usageType || 'general';
  const slotWeight = options.slotWeight || 1;
  const usageFitBonus = hasRecommendedUse(performanceParameter, usageType) ? 1.08 : 1;

  return (performanceScore * slotWeight * usageFitBonus) / price;
}

export function calculateBuildPerformanceScore(components, performanceByComponentId, usageType) {
  const entries = requiredBuildSlots.map((slot) => components[slot]).filter(Boolean);

  if (entries.length === 0) {
    return 0;
  }

  const scores = entries.map((component) => getPerformanceScore(component, performanceByComponentId.get(component.id), usageType));
  if (scores.some((score) => score === null)) return null;

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
  if (!Number.isFinite(score)) return 'Indisponível';
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
  if (!Number.isFinite(score)) return 'Estimativa de desempenho indisponível.';
  const categoryLabel = getCategoryLabel(component?.category);
  if (score >= 85) {
    return `Excelente relação entre preço estimado e desempenho simulado no catalogo para ${categoryLabel}.`;
  }

  if (score >= 70) {
    return `Boa relação entre preço estimado e desempenho simulado no catalogo para ${categoryLabel}.`;
  }

  if (score >= 55) {
    return `Relação equilibrada entre preço estimado e desempenho simulado no catalogo para ${categoryLabel}.`;
  }

  if (score >= 40) {
    return `Custo-benefício regular no catalogo para ${categoryLabel}; compare com alternativas da mesma categoria.`;
  }

  return `Baixo custo-benefício no catalogo para ${categoryLabel}, considerando preço estimado e desempenho simulado informados.`;
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
