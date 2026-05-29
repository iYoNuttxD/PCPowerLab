export const buildScoreWeights = {
  compatibilityScore: 0.3,
  performanceScore: 0.25,
  balanceScore: 0.2,
  budgetScore: 0.15,
  costBenefitScore: 0.1
};

export function clampScore(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

export function calculateWeightedOverallScore(criteria) {
  const total = Object.entries(buildScoreWeights).reduce((score, [criterion, weight]) => (
    score + (clampScore(criteria[criterion]) * weight)
  ), 0);

  return Math.floor(clampScore(total));
}

export function classifyBuildScore(score) {
  if (score >= 90) {
    return 'Excelente';
  }

  if (score >= 75) {
    return 'Muito boa';
  }

  if (score >= 60) {
    return 'Boa';
  }

  if (score >= 40) {
    return 'Regular';
  }

  return 'Não recomendada';
}

export function buildScoreSummary({ compatibility, budgetStatus, bottlenecks, warnings }) {
  const parts = [];

  parts.push(compatibility.compatible
    ? 'A configuração apresenta boa compatibilidade'
    : 'A configuração possui incompatibilidades que reduzem bastante a nota');

  if (bottlenecks?.hasBottleneck === true) {
    parts.push('existem gargalos que podem limitar o desempenho');
  } else if (bottlenecks?.hasBottleneck === false) {
    parts.push('o conjunto está equilibrado entre os principais componentes');
  }

  if (budgetStatus?.status === 'within_budget') {
    parts.push('está dentro do orçamento informado');
  } else if (budgetStatus?.status === 'near_budget') {
    parts.push('fica próxima do orçamento informado');
  } else if (budgetStatus?.status === 'over_budget') {
    parts.push('está acima do orçamento informado');
  }

  if (warnings.length > 0) {
    parts.push('alguns critérios foram calculados com dados parciais');
  }

  return `${parts.join(', ')}.`;
}
