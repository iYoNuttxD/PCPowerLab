import { listComponents } from './component.service.js';
import { checkBuildCompatibility } from './compatibility.service.js';
import { listPerformanceParameters } from './performanceParametersService.js';
import { requiredBuildSlots } from './build.service.js';
import {
  calculateBuildPerformanceScore,
  calculateCostBenefitScore,
  getEstimatedPrice,
  getPerformanceScore
} from '../utils/costBenefitUtils.js';

const supportedPriorities = ['cost-benefit', 'performance', 'lowest-price'];
const supportedUsageTypes = ['gaming', 'general', 'productivity'];

const usageSlotWeights = {
  gaming: {
    cpu: 1.25,
    gpu: 1.55,
    motherboard: 0.85,
    ram: 1,
    storage: 0.9,
    psu: 0.9,
    case: 0.75
  },
  productivity: {
    cpu: 1.45,
    gpu: 0.9,
    motherboard: 0.95,
    ram: 1.25,
    storage: 1.2,
    psu: 0.85,
    case: 0.75
  },
  general: {
    cpu: 1.1,
    gpu: 1,
    motherboard: 0.95,
    ram: 1,
    storage: 1,
    psu: 0.9,
    case: 0.8
  }
};

export function recommendBuildByBudget(input) {
  validateRecommendationPayload(input);

  const budget = normalizeBudget(input.budget);
  const usageType = normalizeUsageType(input.usageType);
  const priority = normalizePriority(budget.priority);
  const performanceParameters = listPerformanceParameters();
  const performanceByComponentId = new Map(
    performanceParameters.map((parameter) => [parameter.componentId, parameter])
  );

  const candidatesBySlot = buildCandidatesBySlot({
    usageType,
    priority,
    performanceByComponentId
  });

  validateCandidateAvailability(candidatesBySlot);

  const recommendation = findBestCompatibleBuild({
    candidatesBySlot,
    budgetAmount: budget.amount,
    usageType,
    priority,
    performanceByComponentId
  });

  if (!recommendation) {
    const error = new Error('Nao foi possivel gerar uma recomendacao completa dentro do orcamento informado.');
    error.statusCode = 422;
    error.errors = ['Tente aumentar o orcamento ou cadastrar mais componentes compativeis na base.'];
    throw error;
  }

  return recommendation;
}

function buildCandidatesBySlot({ usageType, priority, performanceByComponentId }) {
  return requiredBuildSlots.reduce((candidatesBySlot, slot) => {
    const components = listComponents({ type: slot })
      .map((component) => enrichCandidate(component, {
        usageType,
        priority,
        performanceByComponentId,
        slot
      }))
      .filter((candidate) => candidate.estimatedPrice !== null)
      .filter((candidate) => candidate.performanceScore >= 40)
      .sort(compareCandidates(priority));

    return {
      ...candidatesBySlot,
      [slot]: components
    };
  }, {});
}

function enrichCandidate(component, { usageType, priority, performanceByComponentId, slot }) {
  const performanceParameter = performanceByComponentId.get(component.id);
  const estimatedPrice = getEstimatedPrice(component);
  const performanceScore = getPerformanceScore(component, performanceParameter, usageType);
  const costBenefitScore = calculateCostBenefitScore(component, performanceParameter, {
    usageType,
    slotWeight: usageSlotWeights[usageType][slot]
  });

  return {
    ...component,
    estimatedPrice,
    recommendationMeta: {
      performanceScore,
      costBenefitScore: Number(costBenefitScore.toFixed(4)),
      priority
    },
    performanceScore,
    costBenefitScore
  };
}

function findBestCompatibleBuild({
  candidatesBySlot,
  budgetAmount,
  usageType,
  priority,
  performanceByComponentId
}) {
  let bestRecommendation = null;

  visitBuildCombinations({
    candidatesBySlot,
    slotIndex: 0,
    selectedComponents: {},
    onCombination: (components) => {
      const totalEstimatedPrice = calculateTotalEstimatedPrice(components);

      if (totalEstimatedPrice > budgetAmount) {
        return;
      }

      const compatibilityResult = checkBuildCompatibility(mapComponentsToIds(components));

      if (!compatibilityResult.compatible) {
        return;
      }

      const score = calculateRecommendationScore({
        components,
        totalEstimatedPrice,
        budgetAmount,
        usageType,
        priority,
        performanceByComponentId
      });

      if (!bestRecommendation || score > bestRecommendation.score) {
        bestRecommendation = {
          score,
          compatibilityResult,
          components,
          totalEstimatedPrice
        };
      }
    }
  });

  if (!bestRecommendation) {
    return null;
  }

  return formatRecommendation({
    recommendation: bestRecommendation,
    budgetAmount,
    usageType,
    priority,
    performanceByComponentId
  });
}

function visitBuildCombinations({ candidatesBySlot, slotIndex, selectedComponents, onCombination }) {
  if (slotIndex === requiredBuildSlots.length) {
    onCombination(selectedComponents);
    return;
  }

  const slot = requiredBuildSlots[slotIndex];

  for (const candidate of candidatesBySlot[slot]) {
    visitBuildCombinations({
      candidatesBySlot,
      slotIndex: slotIndex + 1,
      selectedComponents: {
        ...selectedComponents,
        [slot]: candidate
      },
      onCombination
    });
  }
}

function calculateRecommendationScore({
  components,
  totalEstimatedPrice,
  budgetAmount,
  usageType,
  priority,
  performanceByComponentId
}) {
  const performanceScore = calculateBuildPerformanceScore(components, performanceByComponentId, usageType);
  const costBenefitScore = Object.values(components).reduce(
    (total, component) => total + component.costBenefitScore,
    0
  );
  const cpuScore = components.cpu.performanceScore;
  const gpuScore = components.gpu.performanceScore;
  const balancePenalty = Math.abs(cpuScore - gpuScore) > 25 ? 8 : 0;
  const budgetUseRatio = totalEstimatedPrice / budgetAmount;

  if (priority === 'performance') {
    return (performanceScore * 1.5) + (budgetUseRatio * 8) + costBenefitScore - balancePenalty;
  }

  if (priority === 'lowest-price') {
    return ((budgetAmount - totalEstimatedPrice) / budgetAmount * 100) + performanceScore - balancePenalty;
  }

  return (costBenefitScore * 100) + performanceScore + (budgetUseRatio * 5) - balancePenalty;
}

function formatRecommendation({
  recommendation,
  budgetAmount,
  usageType,
  priority,
  performanceByComponentId
}) {
  const components = stripInternalCandidateFields(recommendation.components);
  const warnings = buildWarnings(recommendation.components, recommendation.compatibilityResult.alerts);

  return {
    totalEstimatedPrice: Number(recommendation.totalEstimatedPrice.toFixed(2)),
    remainingBudget: Number((budgetAmount - recommendation.totalEstimatedPrice).toFixed(2)),
    usageType,
    priority,
    components,
    summary: buildSummary(usageType, priority),
    warnings,
    performanceScore: calculateBuildPerformanceScore(
      recommendation.components,
      performanceByComponentId,
      usageType
    )
  };
}

function stripInternalCandidateFields(components) {
  return Object.fromEntries(
    Object.entries(components).map(([slot, component]) => {
      const publicComponent = { ...component };
      delete publicComponent.costBenefitScore;
      delete publicComponent.performanceScore;

      return [slot, publicComponent];
    })
  );
}

function buildWarnings(components, compatibilityAlerts) {
  const warnings = compatibilityAlerts.map((alert) => alert.message);
  const cpuScore = components.cpu.performanceScore;
  const gpuScore = components.gpu.performanceScore;

  if (Math.abs(cpuScore - gpuScore) > 25) {
    warnings.push('A diferenca de desempenho entre CPU e GPU pode indicar gargalo em alguns cenarios.');
  }

  return warnings;
}

function buildSummary(usageType, priority) {
  if (usageType === 'gaming') {
    return `Configuracao recomendada com foco em ${translatePriority(priority)} para jogos em 1080p.`;
  }

  if (usageType === 'productivity') {
    return `Configuracao recomendada com foco em ${translatePriority(priority)} para produtividade.`;
  }

  return `Configuracao recomendada com foco em ${translatePriority(priority)} para uso geral.`;
}

function translatePriority(priority) {
  const translations = {
    'cost-benefit': 'custo-beneficio',
    performance: 'desempenho',
    'lowest-price': 'menor preco'
  };

  return translations[priority] || translations['cost-benefit'];
}

function compareCandidates(priority) {
  return (candidateA, candidateB) => {
    if (priority === 'performance') {
      return candidateB.performanceScore - candidateA.performanceScore
        || candidateA.estimatedPrice - candidateB.estimatedPrice;
    }

    if (priority === 'lowest-price') {
      return candidateA.estimatedPrice - candidateB.estimatedPrice
        || candidateB.performanceScore - candidateA.performanceScore;
    }

    return candidateB.costBenefitScore - candidateA.costBenefitScore
      || candidateB.performanceScore - candidateA.performanceScore;
  };
}

function calculateTotalEstimatedPrice(components) {
  return Object.values(components).reduce(
    (total, component) => total + component.estimatedPrice,
    0
  );
}

function mapComponentsToIds(components) {
  return Object.fromEntries(
    Object.entries(components).map(([slot, component]) => [slot, component.id])
  );
}

function validateCandidateAvailability(candidatesBySlot) {
  const missingSlots = requiredBuildSlots.filter((slot) => candidatesBySlot[slot].length === 0);

  if (missingSlots.length === 0) {
    return;
  }

  const error = new Error('Nao ha componentes suficientes para gerar uma recomendacao.');
  error.statusCode = 422;
  error.errors = missingSlots.map((slot) => `Nenhum componente valido encontrado para ${slot}.`);
  throw error;
}

function validateRecommendationPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('Informe os dados para recomendacao.');
    error.statusCode = 400;
    throw error;
  }
}

function normalizeBudget(budgetInput) {
  if (!budgetInput || typeof budgetInput !== 'object' || Array.isArray(budgetInput)) {
    const error = new Error('Orcamento obrigatorio.');
    error.statusCode = 400;
    throw error;
  }

  const amount = Number(budgetInput.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error('Valor de orcamento invalido.');
    error.statusCode = 400;
    error.errors = ['budget.amount deve ser um numero maior que zero.'];
    throw error;
  }

  return {
    amount,
    currency: normalizeText(budgetInput.currency) || 'BRL',
    priority: budgetInput.priority
  };
}

function normalizeUsageType(usageTypeInput) {
  const usageType = normalizeText(usageTypeInput) || 'general';

  if (supportedUsageTypes.includes(usageType)) {
    return usageType;
  }

  const error = new Error('Tipo de uso invalido.');
  error.statusCode = 400;
  error.errors = [`Tipos aceitos: ${supportedUsageTypes.join(', ')}.`];
  throw error;
}

function normalizePriority(priorityInput) {
  const priority = normalizeText(priorityInput) || 'cost-benefit';

  if (supportedPriorities.includes(priority)) {
    return priority;
  }

  const error = new Error('Prioridade invalida.');
  error.statusCode = 400;
  error.errors = [`Prioridades aceitas: ${supportedPriorities.join(', ')}.`];
  throw error;
}

function normalizeText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim().toLowerCase();
}
