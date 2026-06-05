import { generateBuildSummary } from './buildSummaryService.js';
import { calculateBuildScore } from './buildScoreService.js';
import { simulateGamePerformance } from './gamePerformanceService.js';
import { getPurchaseLinksByBuild } from './purchaseLinksService.js';

const defaultUsageType = 'general';
const defaultCurrency = 'BRL';

export function generateBuildReport(input) {
  validateReportPayload(input);

  const build = input.build;
  const usageType = normalizeOptionalText(input.usageType) || defaultUsageType;
  const currency = normalizeCurrency(input.budget?.currency) || defaultCurrency;
  const summary = generateBuildSummary({
    build,
    budget: input.budget,
    usageType
  });

  const gamePerformance = buildGamePerformanceSection({
    gameIds: input.gameIds,
    build,
    targetResolution: input.targetResolution,
    qualityPreset: input.qualityPreset
  });

  const score = runOptionalAnalysis(
    () => calculateBuildScore({
      build,
      budget: input.budget,
      usageType
    }),
    null
  );

  const purchaseLinks = input.includePurchaseLinks === true
    ? runOptionalAnalysis(
      () => getPurchaseLinksByBuild(build),
      {
        available: false,
        message: 'Links de compra indisponiveis para os componentes informados.'
      }
    )
    : undefined;

  return removeUndefinedFields({
    metadata: {
      generatedAt: new Date().toISOString(),
      usageType,
      currency
    },
    components: summary.components,
    pricing: buildPricingSection({
      totalEstimatedPrice: summary.totalEstimatedPrice,
      budgetStatus: summary.budgetStatus,
      budget: input.budget
    }),
    compatibility: summary.compatibility,
    alerts: summary.compatibility?.alerts ?? [],
    bottlenecks: summary.bottlenecks ?? buildUnavailableSection('Analise de gargalos indisponivel para os dados informados.'),
    gamePerformance,
    score,
    purchaseLinks,
    recommendations: buildRecommendationsSection(summary),
    summary: summary.summary
  });
}

function validateReportPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('Informe os dados para gerar o relatorio tecnico da configuracao.');
    error.statusCode = 400;
    throw error;
  }

  if (!input.build || typeof input.build !== 'object' || Array.isArray(input.build)) {
    const error = new Error('Informe a build para gerar o relatorio tecnico da configuracao.');
    error.statusCode = 400;
    error.errors = ['build deve ser informada.'];
    throw error;
  }
}

function buildPricingSection({ totalEstimatedPrice, budgetStatus, budget }) {
  if (!budgetStatus) {
    return {
      totalEstimatedPrice,
      budget: null,
      remaining: null,
      status: 'budget_not_informed'
    };
  }

  return {
    totalEstimatedPrice,
    budget: budgetStatus.amount,
    currency: budgetStatus.currency,
    remaining: budgetStatus.remaining,
    status: budgetStatus.status,
    warnings: budgetStatus.warnings ?? budget?.warnings ?? []
  };
}

function buildGamePerformanceSection({ gameIds, build, targetResolution, qualityPreset }) {
  if (!Array.isArray(gameIds) || gameIds.length === 0) {
    return [];
  }

  return gameIds.map((gameId) => runOptionalAnalysis(
    () => simulateGamePerformance({
      gameId,
      targetResolution,
      qualityPreset,
      build
    }),
    {
      gameId,
      available: false,
      message: 'Simulacao de desempenho indisponivel para este jogo.'
    }
  ));
}

function buildRecommendationsSection(summary) {
  return removeUndefinedFields({
    finalRecommendation: summary.finalRecommendation,
    recommendationObservation: summary.recommendationObservation,
    simpleExplanations: summary.simpleExplanations
  });
}

function runOptionalAnalysis(callback, fallbackValue) {
  try {
    return callback();
  } catch (error) {
    if (!error.statusCode || error.statusCode >= 500) {
      throw error;
    }

    if (fallbackValue && typeof fallbackValue === 'object' && !Array.isArray(fallbackValue)) {
      return {
        ...fallbackValue,
        errors: error.errors ?? [error.message]
      };
    }

    return fallbackValue;
  }
}

function buildUnavailableSection(message) {
  return {
    available: false,
    message
  };
}

function removeUndefinedFields(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}

function normalizeOptionalText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim().toLowerCase();
}

function normalizeCurrency(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim().toUpperCase();
}
