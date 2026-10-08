import { requiredBuildSlots, calculateBuildPrice } from '../services/build.service.js';
import { calculateCostBenefitScore } from './costBenefitUtils.js';
import { usageSlotWeights } from './usageTypeWeights.js';

export const supportedComparisonCriteria = [
  'cost-benefit',
  'performance',
  'budget',
  'balanced'
];

export function calculateBuildCostBenefitScore({ components, performanceByComponentId, usageType }) {
  const componentEntries = requiredBuildSlots
    .filter((slot) => components[slot])
    .map((slot) => [slot, components[slot]]);

  if (componentEntries.length === 0) {
    return 0;
  }

  const scores = componentEntries.map(([slot, component]) => {
    const performanceParameter = performanceByComponentId.get(component.id);
    const slotWeight = usageSlotWeights[usageType]?.[slot] ?? 1;

    return calculateCostBenefitScore(component, performanceParameter, {
      usageType,
      slotWeight
    });
  });
  if (scores.some((score) => score === null)) return null;
  const totalScore = scores.reduce((total, score) => total + score, 0);

  const mainPrice = calculateBuildPrice(Object.fromEntries(componentEntries));
  const totalPrice = calculateBuildPrice(components);
  const coolingCostFactor = totalPrice > 0 ? mainPrice / totalPrice : 1;

  return Number((Math.min(totalScore * 100, 100) * coolingCostFactor).toFixed(2));
}

export function summarizeAlerts(alerts = []) {
  return {
    total: alerts.length,
    high: alerts.filter((alert) => alert.severity === 'high').length,
    medium: alerts.filter((alert) => alert.severity === 'medium').length,
    low: alerts.filter((alert) => alert.severity === 'low').length
  };
}

export function summarizeBottlenecks(bottleneckAnalysis) {
  const bottlenecks = Array.isArray(bottleneckAnalysis?.bottlenecks)
    ? bottleneckAnalysis.bottlenecks
    : [];

  return {
    total: bottlenecks.length,
    high: bottlenecks.filter((bottleneck) => bottleneck.severity === 'high').length,
    medium: bottlenecks.filter((bottleneck) => bottleneck.severity === 'medium').length,
    low: bottlenecks.filter((bottleneck) => bottleneck.severity === 'low').length
  };
}

export function normalizeBudgetStatus(budgetStatus) {
  if (!budgetStatus) {
    return 'not_informed';
  }

  if (budgetStatus.status === 'over_budget') {
    return 'above_budget';
  }

  return budgetStatus.status;
}

export function calculateComparisonScore({ build, criteria }) {
  if (!Number.isFinite(build.performanceScore) || !Number.isFinite(build.costBenefitScore) && criteria !== 'performance') return null;
  const compatibilityScore = build.compatible ? 15 : -35;
  const alertPenalty = (build.alertSummary.high * 12) + (build.alertSummary.medium * 6) + (build.alertSummary.low * 2);
  const bottleneckPenalty = (build.bottleneckSummary.high * 10)
    + (build.bottleneckSummary.medium * 6)
    + (build.bottleneckSummary.low * 2);
  const budgetScore = getBudgetScore(build.budgetStatus);

  if (criteria === 'performance') {
    return build.performanceScore + compatibilityScore + budgetScore - alertPenalty - bottleneckPenalty;
  }

  if (criteria === 'budget') {
    return getBudgetCriteriaScore(build) + compatibilityScore - alertPenalty - bottleneckPenalty;
  }

  if (criteria === 'balanced') {
    return (build.performanceScore * 0.45)
      + (build.costBenefitScore * 0.25)
      + compatibilityScore
      + budgetScore
      - alertPenalty
      - bottleneckPenalty;
  }

  return build.costBenefitScore
    + (build.performanceScore * 0.2)
    + compatibilityScore
    + budgetScore
    - alertPenalty
    - bottleneckPenalty;
}

export function buildRecommendationReason({ criteria, selectedBuild }) {
  if (criteria === 'performance') {
    return 'Melhor pontuação final no critério Desempenho: considera o desempenho estimado, a compatibilidade, o orçamento e as penalidades por alertas e gargalos. Uma configuração com desempenho bruto maior pode ficar atrás se ultrapassar o orçamento.';
  }

  if (criteria === 'budget') {
    return selectedBuild.budgetStatus === 'within_budget'
      ? 'Melhor aderência ao orçamento informado com menor custo estimado relativo entre as builds enviadas.'
      : 'Menor custo de referencia estimado ponderado pelo orçamento entre as opções comparadas.';
  }

  if (criteria === 'balanced') {
    return 'Melhor equilíbrio calculado entre desempenho simulado, compatibilidade, custo estimado e gargalos nas builds enviadas.';
  }

  return 'Melhor relação calculada entre desempenho simulado, preço estimado e orçamento informado nas builds enviadas.';
}

function getBudgetScore(budgetStatus) {
  if (budgetStatus === 'within_budget') {
    return 15;
  }

  if (budgetStatus === 'near_budget') {
    return 5;
  }

  if (budgetStatus === 'above_budget') {
    return -15;
  }

  return 0;
}

function getBudgetCriteriaScore(build) {
  if (build.budgetStatus === 'within_budget') {
    return 100 - Math.min(build.totalEstimatedPrice / 100, 50);
  }

  if (build.budgetStatus === 'near_budget') {
    return 55 - Math.min(build.totalEstimatedPrice / 200, 30);
  }

  if (build.budgetStatus === 'above_budget') {
    return 25 - Math.min(build.totalEstimatedPrice / 500, 20);
  }

  return 60 - Math.min(build.totalEstimatedPrice / 200, 40);
}
