import { summarizeBuildPricing } from './marketPriceService.js';
import { checkBuildCompatibilityAlerts } from './compatibility-alert.service.js';
import { analyzeBuildBottlenecks } from './bottleneck.service.js';
import { createBudget } from './budgetService.js';
import { generateExplanation } from './explanationService.js';
import { simulateGamePerformance } from './gamePerformanceService.js';
import { recommendBuildByBudget } from './recommendationService.js';
import { selectBuildComponents, serializeBuildSelection } from './build.service.js';

const defaultUsageType = 'general';
const recommendedPriorities = ['cost-benefit', 'performance', 'lowest-price'];

export function generateBuildSummary(input) {
  validateSummaryPayload(input);

  const buildInput = normalizeBuildInput(input.build);
  const compatibility = checkBuildCompatibilityAlerts(mapBuildToCompatibilityInput(buildInput));
  const totalEstimatedPrice = Number(compatibility.estimatedPrice.toFixed(2));
  const budgetStatus = input.budget
    ? buildBudgetStatus(input.budget, totalEstimatedPrice)
    : null;
  const bottlenecks = runOptionalAnalysis(
    () => analyzeBuildBottlenecks(buildInput),
    'Análise de gargalos indisponível para os dados informados.'
  );
  const gamePerformance = input.gameId
    ? compatibility.compatible !== true
      ? { available: false, reason: compatibility.status === 'unverified' ? 'unverified_build' : 'incompatible_build', message: 'Simulação indisponível: a compatibilidade da configuração não foi confirmada. Revise os alertas e os dados técnicos pendentes.' }
      : runOptionalAnalysis(
      () => simulateGamePerformance({
        gameId: input.gameId,
        targetResolution: input.targetResolution,
        qualityPreset: input.qualityPreset,
        build: buildInput
      }),
      'Simulação de desempenho indisponível para os dados informados.'
    )
    : null;
  const simpleExplanations = buildSimpleExplanations({
    compatibility,
    bottlenecks,
    budgetStatus,
    gamePerformance,
    usageType: input.usageType
  });
  const recommendation = buildFinalRecommendation({
    compatibility,
    bottlenecks,
    budgetStatus,
    gamePerformance
  });

  return removeEmptySections({
    components: compatibility.selectedComponents,
    pricing: summarizeBuildPricing(selectBuildComponents(buildInput)),
    totalEstimatedPrice,
    budgetStatus,
    compatibility: {
      compatible: compatibility.compatible,
      status: compatibility.status,
      unverifiedChecks: compatibility.unverifiedChecks,
      coolingPower: compatibility.coolingPower,
      alerts: compatibility.alerts
    },
    bottlenecks,
    gamePerformance,
    simpleExplanations,
    summary: buildSummaryText({
      compatibility,
      bottlenecks,
      budgetStatus,
      gamePerformance
    }),
    finalRecommendation: recommendation,
    recommendationObservation: buildRecommendationObservation({
      input,
      compatibility,
      budgetStatus
    })
  });
}

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

function normalizeBuildInput(buildInput) {
  return serializeBuildSelection(selectBuildComponents(buildInput));
}

function mapBuildToCompatibilityInput(buildInput) {
  return buildInput;
}

function buildBudgetStatus(budgetInput, totalEstimatedPrice) {
  const budget = createBudget(budgetInput);
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
    if (!error.statusCode || error.statusCode >= 500) {
      throw error;
    }

    return {
      available: false,
      message: fallbackMessage,
      errors: error.errors ?? [error.message]
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

  if (budgetStatus) {
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

  parts.push(compatibility.compatible
    ? 'A configuração está compatível'
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
  if (compatibility.status === 'unverified') {
    return 'Confirme os dados técnicos pendentes de refrigeração e montagem antes da compra.';
  }
  if (!compatibility.compatible) {
    return 'Revise as incompatibilidades antes de seguir com a compra.';
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

function buildRecommendationObservation({ input, compatibility, budgetStatus }) {
  if (!input.budget || !compatibility.compatible) {
    return null;
  }

  const priority = recommendedPriorities.includes(budgetStatus.priority)
    ? budgetStatus.priority
    : 'cost-benefit';

  return runOptionalAnalysis(
    () => {
      const recommendation = recommendBuildByBudget({
        budget: {
          amount: budgetStatus.amount,
          currency: budgetStatus.currency,
          priority
        },
        usageType: input.usageType || defaultUsageType
      });

      return {
        message: 'Existe uma recomendação compatível para comparar com a build atual.',
        totalEstimatedPrice: recommendation.totalEstimatedPrice,
        remainingBudget: recommendation.remainingBudget,
        performanceScore: recommendation.performanceScore
      };
    },
    'Recomendacao comparativa indisponível para os dados informados.'
  );
}

function removeEmptySections(summary) {
  return Object.fromEntries(
    Object.entries(summary).filter(([, value]) => value !== null && value !== undefined)
  );
}
