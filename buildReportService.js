import { generateBuildSummary } from './buildSummaryService.js';
import { calculateBuildScore } from './buildScoreService.js';
import { simulateGamePerformance } from './gamePerformanceService.js';
import { getPurchaseLinksByBuild } from './purchaseLinksService.js';

const defaultCurrency = 'BRL';
const defaultUsageType = 'general';

export function generateBuildReport(input) {
  validateReportPayload(input);

  const usageType = normalizeOptionalText(input.usageType) || defaultUsageType;
  const currency = normalizeOptionalText(input.budget?.currency)?.toUpperCase() || defaultCurrency;
  const summary = generateBuildSummary({
    build: input.build,
    budget: input.budget,
    usageType,
    targetResolution: input.targetResolution,
    qualityPreset: input.qualityPreset
  });
  const gamePerformance = buildGamePerformanceSection({
    build: input.build,
    gameIds: input.gameIds,
    targetResolution: input.targetResolution,
    qualityPreset: input.qualityPreset
  });
  const score = runOptionalAnalysis(
    () => calculateBuildScore({
      build: input.build,
      budget: input.budget,
      usageType
    }),
    null
  );
  const purchaseLinks = input.includePurchaseLinks === true
    ? runOptionalAnalysis(() => getPurchaseLinksByBuild(input.build), {})
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
      budgetInput: input.budget,
      currency
    }),
    compatibility: summary.compatibility,
    alerts: summary.compatibility?.alerts ?? [],
    bottlenecks: summary.bottlenecks ?? buildUnavailableSection('Analise de gargalos indisponivel.'),
    gamePerformance,
    score,
    purchaseLinks,
    recommendations: buildRecommendationsSection(summary),
    summary: buildReportSummary({
      summaryText: summary.summary,
      gamePerformance,
      score,
      includePurchaseLinks: input.includePurchaseLinks === true
    })
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
    throw error;
  }

  if (input.gameIds !== undefined && !Array.isArray(input.gameIds)) {
    const error = new Error('gameIds deve ser um array.');
    error.statusCode = 400;
    throw error;
  }
}

function buildPricingSection({ totalEstimatedPrice, budgetStatus, budgetInput, currency }) {
  if (!budgetStatus) {
    return {
      totalEstimatedPrice,
      budget: budgetInput?.amount ?? null,
      currency,
      remaining: null,
      status: 'not_provided'
    };
  }

  return {
    totalEstimatedPrice,
    budget: budgetStatus.amount,
    currency: budgetStatus.currency,
    remaining: budgetStatus.remaining,
    status: budgetStatus.status,
    warnings: budgetStatus.warnings ?? []
  };
}

function buildGamePerformanceSection({ build, gameIds, targetResolution, qualityPreset }) {
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
    buildUnavailableSection('Simulacao de desempenho indisponivel para este jogo.', { gameId })
  ));
}

function buildRecommendationsSection(summary) {
  return removeUndefinedFields({
    finalRecommendation: summary.finalRecommendation,
    recommendationObservation: summary.recommendationObservation,
    simpleExplanations: summary.simpleExplanations
  });
}

function buildReportSummary({ summaryText, gamePerformance, score, includePurchaseLinks }) {
  const parts = [summaryText || 'Relatorio tecnico gerado com os dados disponiveis.'];

  if (gamePerformance.length > 0) {
    parts.push(`Foram avaliados ${gamePerformance.length} jogo(s) informado(s).`);
  }

  if (score?.overallScore !== undefined) {
    parts.push(`Nota geral: ${score.overallScore} (${score.classification}).`);
  }

  if (includePurchaseLinks) {
    parts.push('Links de compra foram incluidos quando cadastrados.');
  }

  return parts.join(' ');
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

function buildUnavailableSection(message, extra = {}) {
  return {
    available: false,
    message,
    ...extra
  };
}

function removeUndefinedFields(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  );
}

function normalizeOptionalText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}
