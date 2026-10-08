import { listComponents } from './component.service.js';
import { checkBuildCompatibility } from './compatibility.service.js';
import { listPerformanceParameters } from './performanceParametersService.js';
import { requiredBuildSlots, selectOptionalBuildComponents, serializeBuildSelection, calculateBuildPrice } from './build.service.js';
import {
  calculateBuildPerformanceScore,
  calculateCostBenefitScore,
  getEstimatedPrice,
  getPerformanceScore
} from '../utils/costBenefitUtils.js';
import {
  supportedUsageTypes,
  usageSlotWeights,
  usageTypeSummaries,
  usageTypeStrategies
} from '../utils/usageTypeWeights.js';

const supportedPriorities = ['cost-benefit', 'performance', 'lowest-price', 'balanced'];
const rangeRecommendationLimit = 3;



export function recommendBuildsByBudgetRange(input) {
  validateRecommendationPayload(input);
  const optionalComponents = selectOptionalBuildComponents(input);
  validateOptionalPrices(optionalComponents);

  const budgetRange = normalizeBudgetRange(input.budgetRange);
  const usageType = normalizeUsageType(input.usageType);
  const priority = normalizeRangePriority(input.priority);
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

  const recommendations = findCompatibleBuildsByBudgetRange({
    optionalComponents,
    candidatesBySlot,
    budgetRange,
    usageType,
    priority,
    performanceByComponentId,
    limit: rangeRecommendationLimit
  });

  if (recommendations.length === 0) {
    const error = new Error('Nao foi possivel gerar uma build completa dentro da faixa de orcamento informada.');
    error.statusCode = 422;
    error.errors = ['Tente ampliar a faixa de orcamento ou cadastrar mais componentes compativeis na base.'];
    throw error;
  }

  return recommendations;
}

export function recommendBuildByBudget(input) {
  validateRecommendationPayload(input);
  const optionalComponents = selectOptionalBuildComponents(input);
  validateOptionalPrices(optionalComponents);

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
    optionalComponents,
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

    const balancedCandidates = selectBalancedCandidatePool(components, priority);

    return {
      ...candidatesBySlot,
      [slot]: balancedCandidates
    };
  }, {});
}


function selectBalancedCandidatePool(components, priority) {
  const preferredCandidates = components.slice(0, 5);
  const cheapestCandidates = [...components]
    .sort((candidateA, candidateB) => candidateA.estimatedPrice - candidateB.estimatedPrice)
    .slice(0, 3);
  const performanceCandidates = [...components]
    .sort((candidateA, candidateB) => candidateB.performanceScore - candidateA.performanceScore)
    .slice(0, priority === 'performance' ? 4 : 2);

  return [...preferredCandidates, ...cheapestCandidates, ...performanceCandidates]
    .filter((candidate, index, allCandidates) => allCandidates.findIndex((item) => item.id === candidate.id) === index);
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


function findCompatibleBuildsByBudgetRange({
  optionalComponents,
  candidatesBySlot,
  budgetRange,
  usageType,
  priority,
  performanceByComponentId,
  limit
}) {
  const rankedRecommendations = [];

  visitBuildCombinations({
    candidatesBySlot,
    slotIndex: 0,
    selectedComponents: optionalComponents,
    maxBudget: budgetRange.max,
    onCombination: (components) => {
      const totalEstimatedPrice = calculateTotalEstimatedPrice(components);

      if (totalEstimatedPrice < budgetRange.min || totalEstimatedPrice > budgetRange.max) {
        return;
      }

      const compatibilityResult = checkBuildCompatibility(mapComponentsToIds(components));

      if (!compatibilityResult.compatible) {
        return;
      }

      const score = calculateRecommendationScore({
        components,
        totalEstimatedPrice,
        budgetAmount: budgetRange.max,
        usageType,
        priority,
        performanceByComponentId
      });

      rankedRecommendations.push({
        score,
        compatibilityResult,
        components,
        totalEstimatedPrice
      });
    }
  });

  return rankedRecommendations
    .sort((recommendationA, recommendationB) => recommendationB.score - recommendationA.score)
    .slice(0, limit)
    .map((recommendation, index) => formatBudgetRangeRecommendation({
      recommendation,
      budgetRange,
      usageType,
      priority,
      performanceByComponentId,
      position: index + 1
    }));
}

function findBestCompatibleBuild({
  optionalComponents,
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
    selectedComponents: optionalComponents,
    maxBudget: budgetAmount,
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

function visitBuildCombinations({ candidatesBySlot, slotIndex, selectedComponents, onCombination, maxBudget = null }) {
  if (maxBudget) {
    const currentEstimatedPrice = calculateTotalEstimatedPrice(selectedComponents);
    const minimumRemainingPrice = calculateMinimumRemainingPrice(candidatesBySlot, slotIndex);

    if (currentEstimatedPrice > maxBudget || currentEstimatedPrice + minimumRemainingPrice > maxBudget) {
      return;
    }
  }

  if (slotIndex === requiredBuildSlots.length) {
    onCombination(selectedComponents);
    return;
  }

  const slot = requiredBuildSlots[slotIndex];

  for (const candidate of candidatesBySlot[slot]) {
    const nextSelectedComponents = {
      ...selectedComponents,
      [slot]: candidate
    };

    if (!isPartialSelectionViable(nextSelectedComponents)) {
      continue;
    }

    visitBuildCombinations({
      candidatesBySlot,
      slotIndex: slotIndex + 1,
      selectedComponents: nextSelectedComponents,
      onCombination,
      maxBudget
    });
  }
}



function isPartialSelectionViable(components) {
  if (components.cpu && components.motherboard && components.cpu.specs.socket !== components.motherboard.specs.socket) {
    return false;
  }

  if (components.ram && components.motherboard && components.ram.specs.memoryType !== components.motherboard.specs.memoryType) {
    return false;
  }

  if (components.storage && components.motherboard && !components.motherboard.specs.storageInterfaces.includes(components.storage.specs.interface)) {
    return false;
  }

  if (components.psu && components.cpu && components.gpu) {
    const minimumRecommended = Math.max(
      components.gpu.specs.recommendedPsuWatts || 0,
      (components.cpu.specs.tdpWatts || 0) + 350
    );

    if (components.psu.specs.watts < minimumRecommended) {
      return false;
    }
  }

  if (components.case && components.motherboard && !components.case.specs.supportedFormFactors.includes(components.motherboard.specs.formFactor)) {
    return false;
  }

  if (components.case && components.gpu && components.gpu.specs.lengthMm > components.case.specs.maxGpuLengthMm) {
    return false;
  }

  return true;
}

function calculateMinimumRemainingPrice(candidatesBySlot, slotIndex) {
  return requiredBuildSlots.slice(slotIndex).reduce((total, slot) => {
    const cheapestCandidate = candidatesBySlot[slot].reduce(
      (cheapest, candidate) => candidate.estimatedPrice < cheapest.estimatedPrice ? candidate : cheapest,
      candidatesBySlot[slot][0]
    );

    return total + (cheapestCandidate?.estimatedPrice || 0);
  }, 0);
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
  const mainPrice = calculateBuildPrice(Object.fromEntries(requiredBuildSlots.map((slot) => [slot, components[slot]])));
  const costBenefitScore = requiredBuildSlots.reduce(
    (total, slot) => total + (components[slot]?.costBenefitScore ?? 0),
    0
  ) * (totalEstimatedPrice > 0 ? mainPrice / totalEstimatedPrice : 1);
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


function formatBudgetRangeRecommendation({
  recommendation,
  budgetRange,
  usageType,
  priority,
  performanceByComponentId,
  position
}) {
  const components = stripInternalCandidateFields(recommendation.components);
  const warnings = buildWarnings(recommendation.components, recommendation.compatibilityResult.alerts);
  const performanceScore = calculateBuildPerformanceScore(
    recommendation.components,
    performanceByComponentId,
    usageType
  );

  return {
    name: buildRecommendationName(usageType, priority, position),
    usageType,
    priority,
    components,
    totalEstimatedPrice: Number(recommendation.totalEstimatedPrice.toFixed(2)),
    budgetStatus: getBudgetStatus(recommendation.totalEstimatedPrice, budgetRange),
    compatibilityStatus: recommendation.compatibilityResult.compatible ? 'compatible' : 'incompatible',
    estimatedPerformanceLevel: getEstimatedPerformanceLevel(performanceScore),
    performanceScore,
    costBenefitScore: Number((recommendation.score / 100).toFixed(2)),
    bottleneckWarnings: warnings,
    summary: buildBudgetRangeSummary(usageType, priority, performanceScore, warnings)
  };
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
    strategy: buildStrategy(usageType),
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


function buildRecommendationName(usageType, priority, position) {
  const usageLabels = {
    gaming: 'Gamer',
    work: 'Trabalho',
    'video-editing': 'Edicao de Video',
    programming: 'Programacao',
    design: 'Design',
    general: 'Uso Geral',
    study: 'Estudo',
    streaming: 'Streaming',
    upgrade: 'Upgrade',
    productivity: 'Produtividade'
  };

  const priorityLabels = {
    'cost-benefit': 'Custo-beneficio',
    performance: 'Desempenho',
    'lowest-price': 'Menor preco',
    balanced: 'Equilibrada'
  };

  const suffix = position > 1 ? ` ${position}` : '';

  return `Build ${usageLabels[usageType] || usageLabels.general} ${priorityLabels[priority] || priorityLabels.balanced}${suffix}`;
}

function getBudgetStatus(totalEstimatedPrice, budgetRange) {
  if (totalEstimatedPrice < budgetRange.min) {
    return 'below_range';
  }

  if (totalEstimatedPrice > budgetRange.max) {
    return 'above_range';
  }

  return 'within_range';
}

function getEstimatedPerformanceLevel(performanceScore) {
  if (performanceScore >= 85) {
    return 'excellent';
  }

  if (performanceScore >= 70) {
    return 'good';
  }

  if (performanceScore >= 55) {
    return 'basic';
  }

  return 'entry';
}

function buildBudgetRangeSummary(usageType, priority, performanceScore, warnings) {
  const baseSummary = usageTypeSummaries[usageType] || usageTypeSummaries.general;
  const bottleneckSummary = warnings.length > 0
    ? ' Ha possiveis gargalos basicos indicados nos avisos.'
    : ' Nao foram identificados gargalos basicos relevantes.';

  return `${baseSummary} Foco em ${translatePriority(priority)} com nivel estimado ${getEstimatedPerformanceLevel(performanceScore)}.${bottleneckSummary}`;
}

function buildStrategy(usageType) {
  return usageTypeStrategies[usageType] || usageTypeStrategies.general;
}

function stripInternalCandidateFields(components) {
  return Object.fromEntries(
    Object.entries(components).map(([slot, component]) => {
      if (Array.isArray(component)) {
        return [slot, component.map((entry) => ({ ...entry }))];
      }
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
  const baseSummary = usageTypeSummaries[usageType] || usageTypeSummaries.general;

  return `${baseSummary} Foco em ${translatePriority(priority)}.`;
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
  return calculateBuildPrice(components);
}

function mapComponentsToIds(components) {
  return serializeBuildSelection(components);
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


function normalizeBudgetRange(budgetRangeInput) {
  if (!budgetRangeInput || typeof budgetRangeInput !== 'object' || Array.isArray(budgetRangeInput)) {
    const error = new Error('Faixa de orcamento obrigatoria.');
    error.statusCode = 400;
    error.errors = ['budgetRange.min e budgetRange.max devem ser informados.'];
    throw error;
  }

  const min = Number(budgetRangeInput.min);
  const max = Number(budgetRangeInput.max);

  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
    const error = new Error('Faixa de orcamento invalida.');
    error.statusCode = 400;
    error.errors = ['budgetRange.min e budgetRange.max devem ser numeros positivos.'];
    throw error;
  }

  if (min >= max) {
    const error = new Error('Faixa de orcamento invalida.');
    error.statusCode = 400;
    error.errors = ['budgetRange.min deve ser menor que budgetRange.max.'];
    throw error;
  }

  return { min, max };
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


function normalizeRangePriority(priorityInput) {
  const priority = normalizeText(priorityInput) || 'cost-benefit';

  if (priority === 'balanced') {
    return priority;
  }

  if (supportedPriorities.includes(priority)) {
    return priority;
  }

  return 'cost-benefit';
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

function validateOptionalPrices(components) {
  const accessories = [components.cooler, ...(components.fans ?? [])].filter(Boolean);
  if (accessories.some((component) => getEstimatedPrice(component) === null)) {
    const error = new Error('Preco indisponivel para um acessorio de refrigeracao selecionado.');
    error.statusCode = 422;
    throw error;
  }
}
