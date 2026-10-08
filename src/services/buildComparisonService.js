import { buildDecisionMethodology } from '../utils/decisionMethodology.js';
import { generateBuildSummary } from './buildSummaryService.js';
import { createBudget } from './budgetService.js';
import { listPerformanceParameters } from './performanceParametersService.js';
import { findGameById } from './gamePerformanceService.js';
import { calculateBuildPerformanceScore } from '../utils/costBenefitUtils.js';
import {
  buildRecommendationReason,
  calculateBuildCostBenefitScore,
  calculateComparisonScore,
  normalizeBudgetStatus,
  summarizeAlerts,
  summarizeBottlenecks,
  supportedComparisonCriteria
} from '../utils/comparisonUtils.js';

const defaultUsageType = 'general';
const defaultComparisonCriteria = 'balanced';

export function compareBuilds(input) {
  validateComparisonPayload(input);

  const usageType = normalizeOptionalText(input.usageType) || defaultUsageType;
  const comparisonCriteria = normalizeComparisonCriteria(input.comparisonCriteria);
  const budget = input.budget ? createBudget(input.budget) : null;

  validateGameWhenInformed(input.gameId);

  const performanceParameters = listPerformanceParameters();
  const performanceByComponentId = new Map(
    performanceParameters.map((parameter) => [parameter.componentId, parameter])
  );
  const builds = input.builds.map((buildInput, index) => analyzeBuildForComparison({
    buildInput,
    index,
    budget,
    usageType,
    gameId: input.gameId,
    targetResolution: input.targetResolution,
    qualityPreset: input.qualityPreset,
    performanceByComponentId,
    comparisonCriteria
  }));
  const recommendedBuild = selectRecommendedBuild({ builds, comparisonCriteria });

  return removeEmptyFields({
    methodology: buildDecisionMethodology({ usageType, scope: 'submitted_builds_only', ranking: 'Compara somente as builds enviadas; combina desempenho simulado, custo de referencia, compatibilidade, orcamento e penalidades de alertas/gargalos conforme o criterio.' }),
    comparisonCriteria,
    usageType,
    budget: budget
      ? {
        amount: budget.amount,
        currency: budget.currency,
        priority: budget.priority
      }
      : null,
    builds: builds.map(stripInternalFields),
    recommendedBuild
  });
}

function analyzeBuildForComparison({
  buildInput,
  index,
  budget,
  usageType,
  gameId,
  targetResolution,
  qualityPreset,
  performanceByComponentId,
  comparisonCriteria
}) {
  const name = trimOptionalText(buildInput.name) || `Build ${index + 1}`;
  const componentsInput = normalizeBuildComponentsInput(buildInput);
  const summary = generateBuildSummary({
    build: componentsInput,
    budget,
    gameId,
    usageType,
    targetResolution,
    qualityPreset
  });
  const performanceScore = calculatePerformanceScore({
    summary,
    performanceByComponentId,
    usageType
  });
  const costBenefitScore = calculateBuildCostBenefitScore({
    components: summary.components,
    performanceByComponentId,
    usageType
  });
  const budgetStatus = normalizeBudgetStatus(summary.budgetStatus);
  const alertSummary = summarizeAlerts(summary.compatibility.alerts);
  const bottleneckSummary = summarizeBottlenecks(summary.bottlenecks);
  const build = {
    name,
    totalEstimatedPrice: summary.totalEstimatedPrice,
    priceBasis: 'catalog_reference_estimate',
    performanceBasis: 'simulated_catalog_parameters',
    compatible: summary.compatibility.compatible,
    compatibilityStatus: summary.compatibility.status,
    unverifiedChecks: summary.compatibility.unverifiedChecks,
    components: summary.components,
    alertSummary,
    performanceScore,
    costBenefitScore,
    hasBottleneck: summary.bottlenecks?.hasBottleneck === true,
    bottleneckSummary,
    budgetStatus,
    gamePerformance: summary.gamePerformance,
    summary: buildComparisonSummary({
      compatible: summary.compatibility.compatible,
      budgetStatus,
      hasBottleneck: summary.bottlenecks?.hasBottleneck === true,
      gamePerformance: summary.gamePerformance,
      usageType
    }),
    sourceSummary: summary
  };

  return {
    ...build,
    comparisonScore: Number(calculateComparisonScore({ build, criteria: comparisonCriteria }).toFixed(2))
  };
}

function calculatePerformanceScore({ summary, performanceByComponentId, usageType }) {
  if (Number.isFinite(summary.gamePerformance?.technicalDetails?.weightedPerformanceIndex)) {
    return Number(summary.gamePerformance.technicalDetails.weightedPerformanceIndex.toFixed(2));
  }

  return calculateBuildPerformanceScore(summary.components, performanceByComponentId, usageType);
}

function selectRecommendedBuild({ builds, comparisonCriteria }) {
  const selectedBuild = builds.reduce((bestBuild, currentBuild) => {
    if (!bestBuild || currentBuild.comparisonScore > bestBuild.comparisonScore) {
      return currentBuild;
    }

    return bestBuild;
  }, null);

  return {
    name: selectedBuild.name,
    reason: buildRecommendationReason({ criteria: comparisonCriteria, selectedBuild }),
    comparisonScore: selectedBuild.comparisonScore
  };
}

function buildComparisonSummary({
  compatible,
  budgetStatus,
  hasBottleneck,
  gamePerformance,
  usageType
}) {
  const parts = [];

  parts.push(compatible
    ? `Configuracao compativel segundo as regras do catalogo para ${usageType}.`
    : 'Configuracao tem incompatibilidades ou verificacoes pendentes que reduzem sua recomendacao.');

  if (budgetStatus === 'within_budget') {
    parts.push('O custo de referencia estimado esta dentro do orcamento informado.');
  } else if (budgetStatus === 'near_budget') {
    parts.push('O custo de referencia estimado fica proximo do orcamento, mas ultrapassa um pouco o valor informado.');
  } else if (budgetStatus === 'above_budget') {
    parts.push('O custo de referencia estimado esta acima do orcamento informado.');
  }

  if (hasBottleneck) {
    parts.push('Possui gargalos que podem afetar o desempenho.');
  }

  if (gamePerformance?.estimatedFps) {
    parts.push(`Simulacao estimada de ${gamePerformance.estimatedFps} FPS no jogo informado.`);
  }

  return parts.join(' ');
}

function validateComparisonPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('Informe os dados para comparar configuracoes.');
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(input.builds) || input.builds.length < 2) {
    const error = new Error('Informe pelo menos duas builds para comparacao.');
    error.statusCode = 400;
    error.errors = ['builds deve conter pelo menos duas configuracoes.'];
    throw error;
  }
}

function validateGameWhenInformed(gameId) {
  if (!gameId) {
    return;
  }

  if (findGameById(gameId)) {
    return;
  }

  const error = new Error('Jogo nao encontrado.');
  error.statusCode = 404;
  throw error;
}

function normalizeBuildComponentsInput(buildInput) {
  if (!buildInput || typeof buildInput !== 'object' || Array.isArray(buildInput)) {
    const error = new Error('Build invalida para comparacao.');
    error.statusCode = 400;
    throw error;
  }

  const components = buildInput.components ?? buildInput.build ?? buildInput;

  if (!components || typeof components !== 'object' || Array.isArray(components)) {
    const error = new Error('Componentes da build invalidos para comparacao.');
    error.statusCode = 400;
    throw error;
  }

  return components;
}

function normalizeComparisonCriteria(criteriaInput) {
  const criteria = normalizeOptionalText(criteriaInput) || defaultComparisonCriteria;

  if (supportedComparisonCriteria.includes(criteria)) {
    return criteria;
  }

  const error = new Error('Criterio de comparacao invalido.');
  error.statusCode = 400;
  error.errors = [`Criterios aceitos: ${supportedComparisonCriteria.join(', ')}.`];
  throw error;
}

function stripInternalFields(build) {
  const publicBuild = { ...build };
  delete publicBuild.sourceSummary;

  return publicBuild;
}

function removeEmptyFields(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined)
  );
}

function normalizeOptionalText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim().toLowerCase();
}

function trimOptionalText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}
