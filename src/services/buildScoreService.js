import { generateBuildSummary } from './buildSummaryService.js';
import { listPerformanceParameters } from './performanceParametersService.js';
import { calculateBuildPerformanceScore } from '../utils/costBenefitUtils.js';
import { calculateBuildCostBenefitScore, summarizeAlerts, summarizeBottlenecks } from '../utils/comparisonUtils.js';
import {
  buildScoreSummary,
  calculateWeightedOverallScore,
  classifyBuildScore,
  clampScore
} from '../utils/buildScoreUtils.js';

const defaultUsageType = 'general';
const performanceSlots = ['cpu', 'gpu', 'ram', 'storage'];

export function calculateBuildScore(input) {
  validateScorePayload(input);

  const usageType = normalizeOptionalText(input.usageType) || defaultUsageType;
  const summary = generateBuildSummary({
    build: input.build,
    budget: input.budget,
    usageType
  });
  const performanceByComponentId = new Map(
    listPerformanceParameters().map((parameter) => [parameter.componentId, parameter])
  );
  const warnings = [];
  const priceAvailable = summary.totalEstimatedPrice !== null;
  if (!priceAvailable) warnings.push('Nota geral e custo-benefício indisponíveis: há componentes sem preço de referência. Os critérios técnicos continuam disponíveis.');
  const criteria = {
    compatibilityScore: calculateCompatibilityScore(summary.compatibility),
    performanceScore: calculatePerformanceCriterion({
      components: summary.components,
      performanceByComponentId,
      usageType,
      warnings
    }),
    balanceScore: calculateBalanceScore(summary.bottlenecks, warnings),
    budgetScore: calculateBudgetScore(summary.budgetStatus, warnings),
    costBenefitScore: priceAvailable ? calculateCostBenefitCriterion({
      components: summary.components,
      performanceByComponentId,
      usageType
    }) : null
  };
  const overallScore = priceAvailable ? calculateWeightedOverallScore(criteria) : null;

  return removeEmptyFields({
    overallScore,
    classification: priceAvailable ? classifyBuildScore(overallScore) : 'Indisponível',
    available: priceAvailable,
    criteria,
    summary: buildScoreSummary({
      compatibility: summary.compatibility,
      budgetStatus: summary.budgetStatus,
      bottlenecks: summary.bottlenecks,
      warnings
    }),
    warnings,
    source: {
      totalEstimatedPrice: summary.totalEstimatedPrice,
      pricing: summary.pricing,
      compatible: summary.compatibility.compatible,
      hasBottleneck: summary.bottlenecks?.hasBottleneck === true,
      budgetStatus: summary.budgetStatus?.status
    }
  });
}

function validateScorePayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('Informe os dados para calcular a nota da configuração.');
    error.statusCode = 400;
    throw error;
  }

  if (!input.build || typeof input.build !== 'object' || Array.isArray(input.build)) {
    const error = new Error('Informe a build para calcular a nota da configuração.');
    error.statusCode = 400;
    throw error;
  }
}

function calculateCompatibilityScore(compatibility) {
  const alertSummary = summarizeAlerts(compatibility.alerts);
  const penalty = (alertSummary.high * 45) + (alertSummary.medium * 20) + (alertSummary.low * 8);
  const incompatibilityPenalty = compatibility.compatible ? 0 : 25;

  return clampScore(100 - penalty - incompatibilityPenalty);
}

function calculatePerformanceCriterion({
  components,
  performanceByComponentId,
  usageType,
  warnings
}) {
  const missingSlots = performanceSlots.filter((slot) => !performanceByComponentId.has(components[slot]?.id));

  if (missingSlots.length > 0) {
    warnings.push(`Parâmetros de desempenho ausentes para: ${missingSlots.join(', ')}.`);
  }

  return clampScore(calculateBuildPerformanceScore(components, performanceByComponentId, usageType));
}

function calculateBalanceScore(bottlenecks, warnings) {
  if (bottlenecks?.available === false) {
    warnings.push('Análise de gargalos indisponível para os dados informados.');

    return 50;
  }

  const bottleneckSummary = summarizeBottlenecks(bottlenecks);
  const penalty = (bottleneckSummary.high * 35) + (bottleneckSummary.medium * 18) + (bottleneckSummary.low * 8);

  return clampScore(100 - penalty);
}

function calculateBudgetScore(budgetStatus, warnings) {
  if (budgetStatus?.status === 'unavailable') {
    warnings.push('Critério de orçamento indisponível: o subtotal conhecido não representa o total.');
    return null;
  }
  if (!budgetStatus) {
    warnings.push('Orçamento não informado; critério de orçamento calculado com nota neutra.');

    return 70;
  }

  if (budgetStatus.status === 'within_budget') {
    const remainingRatio = budgetStatus.amount > 0 ? budgetStatus.remaining / budgetStatus.amount : 0;

    return clampScore(90 + Math.min(remainingRatio * 10, 5));
  }

  if (budgetStatus.status === 'near_budget') {
    return 65;
  }

  const overflow = Math.abs(budgetStatus.remaining);
  const overflowRatio = budgetStatus.amount > 0 ? overflow / budgetStatus.amount : 1;

  return clampScore(45 - Math.min(overflowRatio * 60, 35));
}

function calculateCostBenefitCriterion({ components, performanceByComponentId, usageType }) {
  return clampScore(Math.min(calculateBuildCostBenefitScore({
    components,
    performanceByComponentId,
    usageType
  }), 80));
}

function normalizeOptionalText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim().toLowerCase();
}

function removeEmptyFields(value) {
  if (!Array.isArray(value.warnings) || value.warnings.length === 0) {
    const publicValue = { ...value };
    delete publicValue.warnings;

    return publicValue;
  }

  return value;
}
