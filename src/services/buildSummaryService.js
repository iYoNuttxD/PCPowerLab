import { usesIntegratedGraphics } from '../utils/graphicsSelection.js';
import { performanceMetadata } from '../utils/performanceMethodology.js';
import { checkBuildCompatibilityAlerts } from './compatibility-alert.service.js';
import { analyzeBuildBottlenecks } from './bottleneck.service.js';
import { createBudget } from './budgetService.js';
import { generateExplanation } from './explanationService.js';
import { simulateGamePerformance } from './gamePerformanceService.js';
import { recommendBuildByBudget } from './recommendationService.js';
import { selectBuildComponents, serializeBuildSelection } from './build.service.js';
import { summarizeBuildPricing } from './marketPriceService.js';
import { listPerformanceParameters } from './performanceParametersService.js';
import { compareRecommendedSelection, explainBuildSelection } from './recommendationExplanationService.js';

const defaultUsageType = 'general';
const recommendedPriorities = ['cost-benefit', 'performance', 'lowest-price', 'balanced'];

// Validate the selection once. A missing analysis is not a missing component,
// and failures in optional sections must not erase independent verified facts.
export function createBuildSummaryGenerator(analyses = {}) {
  const services = {
    compatibility: checkBuildCompatibilityAlerts,
    bottlenecks: analyzeBuildBottlenecks,
    gamePerformance: simulateGamePerformance,
    recommendation: recommendBuildByBudget,
    selectionExplanation: explainBuildSelection,
    ...analyses
  };

  return function generateSummary(input) {
    validateSummaryPayload(input);
    const components = selectBuildComponents(input.build);
    const buildInput = serializeBuildSelection(components);
    const pricing = summarizeBuildPricing(components);
    const performanceByComponentId = new Map(listPerformanceParameters().map(parameter => [parameter.componentId, parameter]));
    const compatibility = {
      compatible: null, alerts: [], unverifiedChecks: [],
      ...runOptionalAnalysis(
        () => services.compatibility(buildInput),
        'Não foi possível verificar a compatibilidade agora. As peças foram mantidas; tente novamente.'
      )
    };
    const budgetStatus = input.budget
      ? { totalEstimatedPrice: pricing.estimatedTotal, remaining: null,
        ...runOptionalAnalysis(() => buildBudgetStatus(input.budget, pricing),
          'Não foi possível avaliar o orçamento informado. Revise o valor e tente novamente.') }
      : null;
    const bottlenecks = runOptionalAnalysis(
      () => services.bottlenecks(buildInput),
      'Não foi possível analisar os gargalos agora. As outras análises continuam disponíveis.'
    );
    const gamePerformance = input.gameId
      ? compatibility.compatible !== true
        ? {
          available: false, status: 'unavailable',
          reason: compatibility.available === false ? 'compatibility_analysis_unavailable'
            : compatibility.status === 'unverified' ? 'unverified_build' : 'incompatible_build',
          message: compatibility.available === false
            ? 'Simulação pendente: tente verificar a compatibilidade novamente.'
            : 'Simulação indisponível: a compatibilidade da configuração não foi confirmada. Revise os alertas e os dados técnicos pendentes.'
        }
        : runOptionalAnalysis(() => services.gamePerformance({
          gameId: input.gameId,
          targetResolution: input.targetResolution,
          qualityPreset: input.qualityPreset,
          build: buildInput
        }), 'Não foi possível simular o jogo informado. Revise o jogo e as configurações ou tente novamente.')
      : null;
    const recommendationObservation = input.budget && budgetStatus?.available !== false
      ? buildRecommendationObservation({ input, buildInput, budgetStatus, components, performanceByComponentId, recommend: services.recommendation })
      : null;
    const selectionExplanation = runOptionalAnalysis(() => services.selectionExplanation({ components,
      usageType: input.usageType || defaultUsageType, priority: budgetStatus?.priority,
      budgetAmount: budgetStatus?.available === false ? null : budgetStatus?.amount,
      compatibility, performanceByComponentId, selectionSource: 'current_selection'
    }), 'Não foi possível explicar as peças agora. Seus componentes, preços e demais análises foram mantidos.');
    const results = { compatibility, bottlenecks, budgetStatus, gamePerformance };
    const sections = Object.fromEntries(Object.entries({ ...results, selectionExplanation, recommendation: recommendationObservation })
      .filter(([, result]) => result != null)
      .map(([name, result]) => [name, {
        status: result.available === false || result.status === 'unavailable' ? 'unavailable'
          : result.status === 'unverified' ? 'unverified' : 'available',
        ...(result.reason ? { reason: result.reason } : {}),
        ...(result.retryable !== undefined ? { retryable: result.retryable } : {})
      }]));

    return removeEmptySections({
      ...performanceMetadata(components),
      selectionStatus: 'complete',
      analysisStatus: Object.values(sections).some(section => section.status !== 'available') ? 'partial' : 'complete',
      sections,
      components,
      pricing,
      selectionExplanation,
      totalEstimatedPrice: pricing.estimatedTotal,
      budgetStatus,
      compatibility: {
        compatible: compatibility.compatible,
        status: compatibility.status,
        ...(compatibility.available === false ? {
          available: false, reason: compatibility.reason, message: compatibility.message,
          retryable: compatibility.retryable, errors: compatibility.errors
        } : {}),
        unverifiedChecks: compatibility.unverifiedChecks,
        coolingPower: compatibility.coolingPower,
        coolingAssessment: compatibility.coolingAssessment,
        alerts: compatibility.alerts
      },
      bottlenecks,
      gamePerformance,
      simpleExplanations: buildSimpleExplanations({ ...results, usageType: input.usageType }),
      summary: buildSummaryText(results),
      finalRecommendation: buildFinalRecommendation(results),
      recommendationObservation
    });
  };
}

export const generateBuildSummary = createBuildSummaryGenerator();

function validateSummaryPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('Informe os dados para gerar o resumo da configuração.');
    error.statusCode = 400;
    throw error;
  }

  if (!input.build || typeof input.build !== 'object' || Array.isArray(input.build)) {
    const error = new Error('Informe a build para gerar o resumo da configuração.');
    error.statusCode = 400;
    throw error;
  }
}

function buildBudgetStatus(budgetInput, pricing) {
  const budget = createBudget(budgetInput);
  const totalEstimatedPrice = pricing.estimatedTotal;
  if (budget.currency !== pricing.currency) {
    return { ...budget, available: false, status: 'unavailable', reason: 'currency_mismatch',
      totalEstimatedPrice, remaining: null,
      message: 'Os preços do catálogo estão em BRL. Informe o orçamento em reais para comparar; não há conversão automática.' };
  }
  if (totalEstimatedPrice === null) {
    return {
      ...budget,
      totalEstimatedPrice: null,
      knownReferenceSubtotal: pricing.knownReferenceSubtotal,
      componentsWithoutReference: pricing.componentsWithoutReference,
      remaining: null,
      status: 'unavailable',
      reason: 'missing_price_reference',
      explanation: generateExplanation({
        type: 'warning',
        data: {
          title: 'Orçamento não verificado',
          message: 'Há componentes sem preço de referência. O subtotal conhecido não representa o custo total da configuração.',
          suggestion: 'Confirme os preços pendentes antes de avaliar o orçamento.',
          severity: 'medium'
        }
      })
    };
  }
  const remaining = Number((budget.amount - totalEstimatedPrice).toFixed(2));
  const status = getBudgetStatus({ amount: budget.amount, totalEstimatedPrice });
  const explanation = generateExplanation({
    type: 'budget',
    data: {
      budgetAmount: budget.amount,
      totalEstimatedPrice,
      remainingBudget: remaining
    }
  });

  return {
    amount: budget.amount,
    currency: budget.currency,
    priority: budget.priority,
    totalEstimatedPrice,
    remaining,
    status,
    warnings: budget.warnings,
    explanation
  };
}

function getBudgetStatus({ amount, totalEstimatedPrice }) {
  if (totalEstimatedPrice <= amount) {
    return 'within_budget';
  }

  if (totalEstimatedPrice <= amount * 1.1) {
    return 'near_budget';
  }

  return 'over_budget';
}

function runOptionalAnalysis(callback, fallbackMessage) {
  try {
    return callback();
  } catch (error) {
    const expected = Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode < 500;
    return {
      available: false,
      status: 'unavailable',
      reason: expected ? 'invalid_analysis_input' : 'analysis_failed',
      retryable: !expected,
      message: fallbackMessage,
      // Unexpected implementation errors are not evidence of missing user data.
      // Do not expose internal exception details in the public response.
      errors: expected ? error.errors ?? [error.message] : []
    };
  }
}

function buildSimpleExplanations({
  compatibility,
  bottlenecks,
  budgetStatus,
  gamePerformance,
  usageType
}) {
  const explanations = [];
  const firstAlert = compatibility.alerts[0];
  const firstBottleneck = bottlenecks?.bottlenecks?.[0];

  if (firstAlert) {
    explanations.push(generateExplanation({
      type: 'incompatibility',
      data: firstAlert
    }));
  }

  if (firstBottleneck) {
    explanations.push(generateExplanation({
      type: 'bottleneck',
      data: {
        ...firstBottleneck,
        ...firstBottleneck.technicalDetails
      }
    }));
  }

  if (budgetStatus?.explanation) {
    explanations.push(budgetStatus.explanation);
  }

  if (gamePerformance?.estimatedFps) {
    explanations.push(generateExplanation({
      type: 'performance',
      data: {
        performanceScore: gamePerformance.estimatedFps,
        usageType: usageType || defaultUsageType
      }
    }));
  }

  if (explanations.length > 0) {
    return explanations;
  }

  return [generateExplanation({
    type: 'general',
    data: {
      title: 'Resumo da configuração',
      message: 'A configuração foi consolidada com os dados disponiveis.',
      suggestion: 'Revise os componentes e os precos antes de finalizar a compra.'
    }
  })];
}

function buildSummaryText({
  compatibility,
  bottlenecks,
  budgetStatus,
  gamePerformance
}) {
  const parts = [];

  parts.push(compatibility.available === false
    ? 'As peças estão selecionadas; a verificação de compatibilidade está temporariamente indisponível'
    : compatibility.compatible
    ? compatibility.coolingAssessment?.status === 'unverified'
      ? 'As verificações principais estão compatíveis; refrigeração não verificada'
      : 'A configuração está compatível'
    : compatibility.status === 'unverified'
      ? 'A compatibilidade não foi verificada por falta de dados técnicos'
      : 'A configuração possui incompatibilidades que precisam de revisão');

  if (budgetStatus) {
    parts.push(buildBudgetSummaryText(budgetStatus));
  }

  if (bottlenecks?.hasBottleneck === true) {
    parts.push('foram identificados gargalos que podem afetar o desempenho');
  } else if (bottlenecks?.hasBottleneck === false) {
    parts.push('o conjunto apresenta bom equilíbrio entre os principais componentes');
  }

  if (gamePerformance?.estimatedFps) {
    parts.push(`a simulação indica cerca de ${gamePerformance.estimatedFps} FPS no jogo informado`);
  }

  return `${parts.join(', ')}.`;
}

function buildBudgetSummaryText(budgetStatus) {
  if (budgetStatus.available === false) return 'o orçamento ainda não pôde ser avaliado';
  if (budgetStatus.status === 'unavailable') {
    return 'o orçamento não foi verificado porque há componentes sem preço de referência';
  }
  if (budgetStatus.status === 'within_budget') {
    return 'está dentro do orçamento informado';
  }

  if (budgetStatus.status === 'near_budget') {
    return 'está próxima do orçamento, mas ultrapassa um pouco o valor informado';
  }

  return 'está acima do orçamento informado';
}

function buildFinalRecommendation({
  compatibility,
  bottlenecks,
  budgetStatus,
  gamePerformance
}) {
  if (compatibility.available === false) {
    return 'A montagem foi preservada. Tente verificar a compatibilidade novamente antes de comprar; consulte as análises que já estão disponíveis.';
  }
  if (compatibility.status === 'unverified') {
    return 'Confirme as verificações técnicas pendentes listadas em Compatibilidade antes da compra. As peças selecionadas foram mantidas.';
  }
  if (!compatibility.compatible) {
    return 'Revise as incompatibilidades antes de seguir com a compra.';
  }

  if (budgetStatus?.available === false) {
    return 'Revise o orçamento informado antes de concluir a compra. As verificações técnicas disponíveis foram mantidas.';
  }

  if (budgetStatus?.status === 'unavailable') {
    return 'Confirme os preços pendentes antes de avaliar o custo total e concluir a compra.';
  }

  if (budgetStatus?.status === 'over_budget') {
    return 'Considere trocar alguns componentes para reduzir o custo total.';
  }

  if (gamePerformance?.available === false) {
    return 'Não foi possível avaliar o desempenho para o jogo informado. Revise os dados e execute a simulação novamente antes de concluir a recomendação.';
  }

  if (gamePerformance?.performanceLevel === 'insufficient' || gamePerformance?.meetsMinimumRequirements === false) {
    return 'O jogo apresenta desempenho estimado insuficiente nas configurações selecionadas. Revise os requisitos e considere reduzir a qualidade ou resolução, ou melhorar as peças limitantes.';
  }

  if (bottlenecks?.available === false && bottlenecks.reason === 'analysis_failed') {
    return 'A análise de gargalos está temporariamente indisponível. Consulte os resultados disponíveis e tente essa análise novamente.';
  }

  if (bottlenecks?.available === false) {
    return 'Dados de desempenho insuficientes para concluir a recomendação. A compatibilidade pelas regras do catálogo não confirma o desempenho.';
  }

  if (bottlenecks?.hasBottleneck) {
    return 'Foram identificados possíveis gargalos. Considere ajustar os componentes destacados para melhorar o equilíbrio estimado.';
  }

  if (!gamePerformance) {
    return 'Configuração compatível pelas regras do catálogo. O desempenho para um jogo específico ainda não foi simulado.';
  }

  return 'Configuração recomendada para o perfil informado.';
}

function buildRecommendationObservation({ input, buildInput, budgetStatus, components, performanceByComponentId, recommend }) {
  const priority = recommendedPriorities.includes(budgetStatus.priority)
    ? budgetStatus.priority
    : 'cost-benefit';

  return runOptionalAnalysis(
    () => {
      const recommendation = recommend({
        budget: {
          amount: budgetStatus.amount,
          currency: budgetStatus.currency,
          priority
        },
        usageType: input.usageType || defaultUsageType,
        // Include selected cooling and its full cost. An alternative must not
        // silently omit accessories to fit the budget or claim compatibility.
        components: buildInput,
        ...(usesIntegratedGraphics(components) ? { selectionMode: 'price-and-compatibility', graphicsMode: 'integrated' } : {})
      });

      return {
        ...recommendation,
        ...(recommendation.components ? { comparison: compareRecommendedSelection(components, recommendation.components,
          performanceByComponentId, input.usageType || defaultUsageType) } : {}),
        available: true,
        message: 'Alternativa compatível pelas regras verificadas, dentro do orçamento e para o uso informado. Compare antes de substituir peças.',
        totalEstimatedPrice: recommendation.totalEstimatedPrice,
        remainingBudget: recommendation.remainingBudget,
        performanceScore: recommendation.performanceScore
      };
    },
    'Não foi possível encontrar uma alternativa verificada dentro do orçamento, para o uso e a refrigeração selecionados. A montagem atual foi mantida.'
  );
}

function removeEmptySections(summary) {
  return Object.fromEntries(
    Object.entries(summary).filter(([key, value]) => key === 'totalEstimatedPrice' || (value !== null && value !== undefined))
  );
}
