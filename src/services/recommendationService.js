import { requiredSlotsFor, usesIntegratedGraphics } from '../utils/graphicsSelection.js';
import { integratedCpuEvidence } from '../data/integratedGraphicsEvidence.js';
import { publishedCpuBiosSupport } from '../data/cpuBiosSupport.js';
import { unavailablePerformance } from '../utils/performanceAvailability.js';
import { performanceMetadata } from '../utils/performanceMethodology.js';
import { buildDecisionMethodology } from '../utils/decisionMethodology.js';
import { isNonEmptyTextArray } from '../models/component.model.js';
import { listComponents } from './component.service.js';
import { evaluateResolvedBuildCompatibility } from './compatibility.service.js';
import { listPerformanceParameters } from './performanceParametersService.js';
import { requiredBuildSlots, selectOptionalBuildComponents, calculateBuildPrice } from './build.service.js';
import { explainBuildSelection } from './recommendationExplanationService.js';
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
  if (input.selectionMode === 'price-and-compatibility' || usesIntegratedGraphics(input)) {
    const error = new Error('Seleção factual disponível na recomendação por orçamento único.'); error.statusCode = 400; throw error;
  }
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
    performanceByComponentId,
    minimumMemoryGb: minimumMemoryFor(input, usageType), minimumVramGb: minimumVramFor(input)
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
  const factual = input.selectionMode === 'price-and-compatibility';
  if (usesIntegratedGraphics(input) && !factual) { const error = new Error('Vídeo integrado usa o critério factual por preço e encaixes, sem ranking de desempenho.'); error.statusCode = 400; throw error; }
  const minimumVramGb = minimumVramFor(input);
  const optionalComponents = selectOptionalBuildComponents(input);
  validateOptionalPrices(optionalComponents);
  if (usesIntegratedGraphics(input)) optionalComponents.graphicsMode = 'integrated';

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
    performanceByComponentId,
    minimumMemoryGb: minimumMemoryFor(input, usageType),
    minimumVramGb, factual, graphicsMode: optionalComponents.graphicsMode
  });

  validateCandidateAvailability(candidatesBySlot);

  const recommendation = findBestCompatibleBuild({
    optionalComponents,
    candidatesBySlot,
    budgetAmount: budget.amount,
    usageType,
    priority,
    allowPendingCooling: input.allowPendingCooling === true,
    performanceByComponentId, factual
  });

  if (!recommendation) {
    const error = budgetFailure({ input, optionalComponents, budget, usageType, performanceByComponentId });
    throw error;
  }

  return recommendation;
}

function buildCandidatesBySlot({ usageType, priority, performanceByComponentId, minimumMemoryGb, minimumVramGb = 0, factual = false, graphicsMode = 'dedicated' }) {
  return requiredSlotsFor({ graphicsMode }).reduce((candidatesBySlot, slot) => {
    const components = listComponents({ type: slot })
      .map((component) => enrichCandidate(component, {
        usageType,
        priority,
        performanceByComponentId,
        slot
      }))
      .filter((candidate) => candidate.estimatedPrice !== null)
      .filter((candidate) => graphicsMode !== 'integrated' || slot !== 'cpu' || integratedCpuEvidence(candidate))
      .filter((candidate) => slot !== 'ram' || candidate.specs?.capacityGb >= minimumMemoryGb)
      .filter((candidate) => slot !== 'gpu' || (candidate.specs?.vramGb ?? 0) >= minimumVramGb)
      .filter((candidate) => factual || Number.isFinite(candidate.performanceScore)
        && candidate.performanceScore >= (['study', 'general'].includes(usageType) ? 0 : 40))
      .sort(factual ? (a, b) => a.estimatedPrice - b.estimatedPrice || a.id.localeCompare(b.id) : compareCandidates(priority));

    const balancedCandidates = factual ? components : selectBalancedCandidatePool(components, priority);

    return {
      ...candidatesBySlot,
      [slot]: balancedCandidates.map(candidate => ({ ...candidate, recommendationMeta: {
        ...candidate.recommendationMeta,
        minimumMemoryGb, minimumVramGb,
        categoryRank: components.findIndex(item => item.id === candidate.id) + 1,
        rankedCandidatesCount: components.length,
        shortlistedCandidatesCount: balancedCandidates.length
      } }))
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
      costBenefitScore: costBenefitScore === null ? null : Number(costBenefitScore.toFixed(4)),
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

      const compatibilityResult = evaluateResolvedBuildCompatibility(components);

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
  allowPendingCooling = false,
  factual = false,
  diagnosticOnly = false,
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
    maxBudget: factual ? () => Math.min(budgetAmount, bestRecommendation?.totalEstimatedPrice ?? Infinity) : budgetAmount,
    onCombination: (components) => {
      const totalEstimatedPrice = calculateTotalEstimatedPrice(components);

      if (totalEstimatedPrice > budgetAmount) {
        return;
      }

      const compatibilityResult = evaluateResolvedBuildCompatibility(components);

      if (diagnosticOnly ? compatibilityResult.alerts.length > 0 : !canPresentRecommendation(components, compatibilityResult, allowPendingCooling, factual)) {
        return;
      }

      const score = factual ? -totalEstimatedPrice : calculateRecommendationScore({
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

  if (diagnosticOnly) return bestRecommendation;
  if (factual) return formatFactualRecommendation({ recommendation: bestRecommendation, budgetAmount, usageType });
  return formatRecommendation({
    recommendation: bestRecommendation,
    budgetAmount,
    usageType,
    priority,
    performanceByComponentId
  });
}

// A pending accessory check may coexist with a useful core proposal. Never
// promote it to compatible or relax CPU/BIOS, electrical or physical conflicts.
function canPresentRecommendation(components, result, allowPendingCooling, factual = false) {
  if (factual && result.status === 'unverified' && !result.alerts.length) {
    const support = publishedCpuBiosSupport(components.cpu, components.motherboard);
    const coolingCodes = new Set(result.coolingAssessment?.unverifiedChecks?.map(check => check.code));
    return result.unverifiedChecks.every(check => check.code === 'CPU_BIOS_UNVERIFIED' ? Boolean(support?.minimumVersion)
      : coolingCodes.has(check.code) && Boolean(allowPendingCooling || components.cpu.specs?.includedCpuCooler?.specSourceUrl));
  }
  if (result.compatible) return true;
  if (!allowPendingCooling || result.status !== 'unverified' || result.alerts.length
    || result.coolingAssessment?.status !== 'unverified' || !result.unverifiedChecks.length) return false;
  const pendingCoolingCodes = new Set(result.coolingAssessment.unverifiedChecks.map(check => check.code));
  if (!result.unverifiedChecks.every(check => pendingCoolingCodes.has(check.code))) return false;
  const core = { ...Object.fromEntries(requiredSlotsFor(components).map(slot => [slot, components[slot]])), ...(usesIntegratedGraphics(components) ? { graphicsMode: 'integrated' } : {}) };
  return evaluateResolvedBuildCompatibility(core).compatible;
}

function visitBuildCombinations({ candidatesBySlot, slotIndex, selectedComponents, onCombination, maxBudget = null }) {
  const budgetLimit = typeof maxBudget === 'function' ? maxBudget() : maxBudget;
  if (budgetLimit != null) {
    const currentEstimatedPrice = calculateTotalEstimatedPrice(selectedComponents);
    const minimumRemainingPrice = calculateMinimumRemainingPrice(candidatesBySlot, slotIndex);

    if (currentEstimatedPrice > budgetLimit || Number((currentEstimatedPrice + minimumRemainingPrice).toFixed(2)) > budgetLimit) {
      return;
    }
  }

  const slots = requiredSlotsFor(selectedComponents);
  if (slotIndex === slots.length) {
    onCombination(selectedComponents);
    return;
  }

  const slot = slots[slotIndex];

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

  if (components.storage && components.motherboard && (!isNonEmptyTextArray(components.motherboard.specs.storageInterfaces)
    || !components.motherboard.specs.storageInterfaces.includes(components.storage.specs.interface))) {
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

  if (components.case && components.motherboard && (!isNonEmptyTextArray(components.case.specs.supportedFormFactors)
    || !components.case.specs.supportedFormFactors.includes(components.motherboard.specs.formFactor))) {
    return false;
  }

  if (components.case && components.gpu && components.gpu.specs.lengthMm > components.case.specs.maxGpuLengthMm) {
    return false;
  }

  return true;
}

function calculateMinimumRemainingPrice(candidatesBySlot, slotIndex) {
  return Object.keys(candidatesBySlot).slice(slotIndex).reduce((total, slot) => {
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
    ...performanceMetadata(recommendation.components, performanceByComponentId),
    selectionExplanation: buildSelectionExplanation(recommendation, usageType, priority, performanceByComponentId, budgetRange.max, budgetRange.min),
    methodology: recommendationMethodology(usageType, priority),
    name: buildRecommendationName(usageType, priority, position),
    usageType,
    priority,
    components,
    coolingAssessment: recommendation.compatibilityResult.coolingAssessment,
    simulationAvailability: unavailablePerformance(components) || { available: true },
    memoryRequirement: { minimumGb: recommendation.components.ram.recommendationMeta.minimumMemoryGb, policy: 'Requisito prático de seleção, não benchmark ou garantia para todos os aplicativos.' },
    totalEstimatedPrice: Number(recommendation.totalEstimatedPrice.toFixed(2)),
    budgetStatus: getBudgetStatus(recommendation.totalEstimatedPrice, budgetRange),
    requestedBudgetRange: { ...budgetRange, currency: 'BRL' },
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
    simulationAvailability: unavailablePerformance(components) || { available: true },
    memoryRequirement: { minimumGb: recommendation.components.ram.recommendationMeta.minimumMemoryGb, policy: 'Requisito prático de seleção, não benchmark ou garantia para todos os aplicativos.' },
    totalEstimatedPrice: Number(recommendation.totalEstimatedPrice.toFixed(2)),
    selectionExplanation: buildSelectionExplanation(recommendation, usageType, priority, performanceByComponentId, budgetAmount),
    ...performanceMetadata(recommendation.components, performanceByComponentId),
    methodology: recommendationMethodology(usageType, priority),
    remainingBudget: Number((budgetAmount - recommendation.totalEstimatedPrice).toFixed(2)),
    requestedBudget: { amount: budgetAmount, currency: 'BRL' },
    compatibilityStatus: recommendation.compatibilityResult.status,
    unverifiedChecks: recommendation.compatibilityResult.unverifiedChecks,
    usageType,
    priority,
    strategy: buildStrategy(usageType),
    components,
    coolingAssessment: recommendation.compatibilityResult.coolingAssessment,
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
    'lowest-price': 'Menor custo estimado no catalogo',
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
    ? ' Há possíveis gargalos indicados nos avisos.'
    : ' Não foram identificados gargalos relevantes.';

  const performanceLabels = { excellent: 'excelente', good: 'bom', basic: 'básico', entry: 'de entrada' };
  const performanceLevel = performanceLabels[getEstimatedPerformanceLevel(performanceScore)];
  return `${baseSummary} Foco em ${translatePriority(priority)}, com desempenho estimado ${performanceLevel}.${bottleneckSummary}`;
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
      if (slot === 'graphicsMode') return [slot, component];
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
    warnings.push('A diferença de desempenho entre processador e placa de vídeo pode indicar gargalo em alguns cenários.');
  }

  if ([cpuScore, gpuScore].some(score => score < 40)) {
    warnings.push('Há uma peça com índice simulado de entrada abaixo de 40/100. O orçamento atendido não garante requisitos de jogos ou programas; confira as limitações antes da compra.');
  }

  return warnings;
}

function buildSelectionExplanation(recommendation, usageType, priority, performanceByComponentId, budgetAmount, budgetMin = null) {
  return explainBuildSelection({ components: recommendation.components, usageType, priority,
    budgetAmount, budgetMin, compatibility: recommendation.compatibilityResult, performanceByComponentId,
    // A single-part comparison can consider the full active catalog, separately
    // from the bounded shortlist used to rank complete builds.
    candidatesBySlot: Object.fromEntries(requiredBuildSlots.map(slot => [slot, listComponents({ type: slot })])) });
}

function buildSummary(usageType, priority) {
  const baseSummary = usageTypeSummaries[usageType] || usageTypeSummaries.general;

  return `${baseSummary} Foco em ${translatePriority(priority)} entre as opções do catálogo.`;
}

function translatePriority(priority) {
  const translations = {
    'cost-benefit': 'custo-benefício',
    performance: 'desempenho',
    balanced: 'equilíbrio',
    'lowest-price': 'menor custo estimado'
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

function validateCandidateAvailability(candidatesBySlot) {
  const missingSlots = Object.keys(candidatesBySlot).filter((slot) => candidatesBySlot[slot].length === 0);

  if (missingSlots.length === 0) {
    return;
  }

  const error = new Error('Nao ha componentes suficientes para gerar uma recomendacao.');
  error.statusCode = 422;
  error.errors = missingSlots.map((slot) => `Nenhum componente com preço de referência válido encontrado para ${slot}.`);
  throw error;
}

function validateRecommendationPayload(input) {
  if (input?.graphicsMode !== undefined && !['integrated', 'dedicated'].includes(input.graphicsMode)) { const error = new Error('Modo de vídeo inválido.'); error.statusCode = 400; throw error; }
  if (input?.selectionMode !== undefined && !['performance-ranked', 'price-and-compatibility'].includes(input.selectionMode)) {
    const error = new Error('Critério de seleção inválido.'); error.statusCode = 400; throw error;
  }
  if (input?.allowPendingCooling !== undefined && typeof input.allowPendingCooling !== 'boolean') {
    const error = new Error('allowPendingCooling deve ser verdadeiro ou falso.');
    error.statusCode = 400;
    throw error;
  }
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

  validateRecommendationCurrency(budgetRangeInput.currency);
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

  validateRecommendationCurrency(budgetInput.currency);
  return {
    amount: Number(amount.toFixed(2)),
    currency: 'BRL',
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

function recommendationMethodology(usageType, priority) {
  return buildDecisionMethodology({
    usageType,
    scope: 'shortlisted_catalog_candidates',
    ranking: `Prioridade ${priority}; combina indice simulado, custo de referencia, pesos por perfil, uso do orcamento e penalidade de desequilibrio CPU/GPU. Busca em subconjunto de candidatos, sem garantia de otimo global. costBenefitScore de faixa e o score composto dividido por 100, nao uma porcentagem.`
  });
}

function validateRecommendationCurrency(currency) {
  if (currency !== undefined && currency !== null && normalizeText(currency) !== 'brl') {
    const error = new Error('Recomendações usam preços em BRL. Informe um orçamento em reais; não há conversão de moeda automática.');
    error.statusCode = 400;
    throw error;
  }
}

function minimumMemoryFor(input, usageType) {
  const value = input.requirements?.minMemoryGb;
  if (value !== undefined && ![8, 16, 32, 64].includes(value)) {
    const error = new Error('Escolha um requisito de memória de 8, 16, 32 ou 64 GB.');
    error.statusCode = 400;
    throw error;
  }
  return value ?? (usesIntegratedGraphics(input) ? 16 : ['study', 'general'].includes(usageType) ? 8 : 16);
}


function minimumVramFor(input) {
  const value = input.requirements?.minVramGb;
  if (usesIntegratedGraphics(input) && value > 0) { const error = new Error('Vídeo integrado compartilha RAM; não satisfaz um requisito de VRAM dedicada. Escolha vídeo dedicado ou remova esse requisito.'); error.statusCode = 400; throw error; }
  if (value !== undefined && ![0, 4, 6, 8, 12, 16].includes(value)) {
    const error = new Error('Escolha um requisito de VRAM de 0, 4, 6, 8, 12 ou 16 GB.'); error.statusCode = 400; throw error;
  }
  return value ?? 0;
}

function formatFactualRecommendation({ recommendation, budgetAmount, usageType }) {
  const { compatibilityResult, totalEstimatedPrice } = recommendation;
  const components = stripInternalCandidateFields(recommendation.components);
  const biosSupport = publishedCpuBiosSupport(components.cpu, components.motherboard);
  const biosMessage = biosSupport ? `O fabricante publica suporte a esta CPU a partir da BIOS ${biosSupport.minimumVersion} nesta placa. A versão instalada não foi inspecionada; confirme antes da compra.` : 'A BIOS instalada não foi inspecionada nesta proposta. Confirme o suporte ao processador na placa e na versão de BIOS exatas antes da compra.';
  // No aggregate performance calculation, balance penalty or synthetic ranking.
  for (const component of Object.values(components).flat()) if (component?.recommendationMeta) {
    component.recommendationMeta = { minimumMemoryGb: component.recommendationMeta.minimumMemoryGb,
      minimumVramGb: component.recommendationMeta.minimumVramGb, selectionBasis: 'price-and-compatibility' };
  }
  return {
    selectionMode: 'price-and-compatibility', priority: 'lowest-price', usageType,
    requestedBudget: { amount: budgetAmount, currency: 'BRL' }, totalEstimatedPrice: Number(totalEstimatedPrice.toFixed(2)),
    remainingBudget: Number((budgetAmount - totalEstimatedPrice).toFixed(2)), components,
    compatibilityStatus: 'unverified', coreCatalogRulesStatus: compatibilityResult.status,
    unverifiedChecks: [...compatibilityResult.unverifiedChecks.filter(check => check.code !== 'CPU_BIOS_UNVERIFIED'), { code: 'CPU_BIOS_UNVERIFIED', verification: 'unverified',
      message: biosMessage }], biosSupport,
    verificationScope: 'Catalog core fit/power rules; installed BIOS and included cooler are not certified.',
    coolingAssessment: compatibilityResult.coolingAssessment,
    memoryRequirement: { minimumGb: recommendation.components.ram.recommendationMeta.minimumMemoryGb,
      policy: 'Requisito de capacidade editável; não confirma requisitos de um aplicativo.' },
    minimumVramGb: recommendation.components.cpu.recommendationMeta.minimumVramGb,
    simulationAvailability: unavailablePerformance(components) || { available: true },
    performanceScore: null, performanceBasis: 'not_used',
    summary: 'Menor total de referência entre os conjuntos que passam pelas regras atuais de encaixe e energia do catálogo que atendem aos requisitos de RAM e VRAM. O perfil orienta a memória mínima; não garante desempenho em jogos ou programas.',
    methodology: { selection: 'price-and-compatibility', performance: { basis: 'not_used' },
      scope: 'active_catalog_with_reference_prices_and_explicit_capacity_requirements', excludes: ['frete', 'montagem', 'periféricos'] },
    warnings: ['Seleção por preço e compatibilidade, sem ranking de desempenho, FPS ou promessa de ausência de gargalos. Preços são referências datadas.'],
    selectionExplanation: explainBuildSelection({ components: recommendation.components, usageType, priority: 'lowest-price',
      budgetAmount, compatibility: { ...compatibilityResult, status: 'unverified', unverifiedChecks: [...compatibilityResult.unverifiedChecks.filter(check => check.code !== 'CPU_BIOS_UNVERIFIED'), { code: 'CPU_BIOS_UNVERIFIED', message: biosMessage }] }, selectionMode: 'price-and-compatibility' })
  };
}

function budgetFailure({ input, optionalComponents, budget, usageType, performanceByComponentId }) {
  const candidatesBySlot = buildCandidatesBySlot({ usageType, priority: 'lowest-price', performanceByComponentId,
    minimumMemoryGb: minimumMemoryFor(input, usageType), minimumVramGb: minimumVramFor(input), factual: true, graphicsMode: optionalComponents.graphicsMode });
  const common = { optionalComponents, candidatesBySlot, usageType, priority: 'lowest-price', performanceByComponentId,
    budgetAmount: Infinity, factual: true, allowPendingCooling: input.allowPendingCooling === true };
  const minimum = findBestCompatibleBuild(common);
  const lowerBound = Number((calculateTotalEstimatedPrice(optionalComponents)
    + calculateMinimumRemainingPrice(candidatesBySlot, 0)).toFixed(2));
  const money = amount => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  const error = new Error(minimum
    ? minimum.totalEstimatedPrice > budget.amount
      ? `Não há proposta confirmada até ${money(budget.amount)}. Menor total encontrado pelas regras de encaixe e energia do catálogo: ${money(minimum.totalEstimatedPrice)}; faltam ${money(minimum.totalEstimatedPrice - budget.amount)}. BIOS instalada e refrigeração ainda precisam de confirmação.`
      : `Há opção factual por ${money(minimum.totalEstimatedPrice)}, mas ela não atende ao filtro de índices do modo atual. Escolha “Preço e encaixes” para examiná-la, sem garantia de desempenho.`
    : 'Nenhum conjunto atende às verificações e aos requisitos atuais; aumentar o orçamento não resolve dados técnicos ausentes.');
  error.statusCode = 422;
  error.errors = [`Requisito: pelo menos ${minimumMemoryFor(input, usageType)} GB de RAM${minimumVramFor(input) ? ` e ${minimumVramFor(input)} GB de VRAM` : ', sem requisito adicional de VRAM'}. Preços de referência, sem frete, montagem ou periféricos; refrigeração selecionada preservada.`,
    `Limite inferior por preços isolados: ${money(lowerBound)}. Essa soma pode misturar peças incompatíveis e não é uma montagem aprovada.`];
  const pending = findBestCompatibleBuild({ ...common, diagnosticOnly: true,
    budgetAmount: minimum?.totalEstimatedPrice ?? Infinity });
  if (pending?.compatibilityResult.unverifiedChecks.length) error.errors.push(
    `Caminho mais barato de ${money(pending.totalEstimatedPrice)} não aprovado: ${[...new Set(pending.compatibilityResult.unverifiedChecks.map(check => check.message))].join(' ')}`);
  error.budgetFeasibility = { minimumVerifiedTotal: null, minimumCatalogRulesTotal: minimum?.totalEstimatedPrice ?? null,
    scope: 'Core catalog fit/power rules; installed BIOS and included cooler not inspected.', lowerBound,
    minimumCatalogRulesComponents: minimum ? Object.fromEntries(requiredSlotsFor(minimum.components).map(slot => [slot, minimum.components[slot].id])) : null,
    pendingTotal: pending?.totalEstimatedPrice ?? null, pendingChecks: pending?.compatibilityResult.unverifiedChecks ?? [] };
  return error;
}
