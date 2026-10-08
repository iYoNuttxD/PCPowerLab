import { buildDecisionMethodology } from '../utils/decisionMethodology.js';
import { getSavedBuildById } from './savedBuildsService.js';
import { selectBuildComponents, serializeBuildSelection, calculateBuildPrice } from './build.service.js';
import { analyzeBuildBottlenecks } from './bottleneck.service.js';
import { createBudget } from './budgetService.js';
import { checkBuildCompatibility } from './compatibility.service.js';
import { generateExplanation } from './explanationService.js';
import { listPerformanceParameters } from './performanceParametersService.js';
import { listComponents } from './component.service.js';
import { recommendBuildByBudget } from './recommendationService.js';
import { calculateCostBenefitScore, getPerformanceScore, getEstimatedPrice } from '../utils/costBenefitUtils.js';
import {
  buildUpgradeReason,
  getUpgradeImpact,
  getUpgradePrioritySlots
} from '../utils/upgradeImpactUtils.js';
import { usageSlotWeights } from '../utils/usageTypeWeights.js';

const defaultUsageType = 'general';
const defaultPriority = 'cost-benefit';

export function suggestUpgrades(input) {
  validateUpgradePayload(input);

  const usageType = normalizeText(input.usageType) || defaultUsageType;
  const priority = normalizeText(input.priority ?? input.budget?.priority) || defaultPriority;
  const budget = input.budget ? createBudget({ ...input.budget, priority }) : null;
  const buildInput = normalizeBuildInput(resolveBuildInput(input));
  const currentBuild = selectBuildComponents(buildInput);
  const currentBuildIds = mapBuildToIds(currentBuild);
  const bottleneckAnalysis = runOptionalAnalysis(() => analyzeBuildBottlenecks(buildInput), null);
  const recommendationReference = runOptionalAnalysis(
    () => recommendBuildByBudget({
      budget: {
        amount: calculateTotalPrice(currentBuild) + (budget?.amount ?? 0),
        currency: budget?.currency ?? 'BRL',
        priority: priority === 'balanced' || priority === 'upgrade-ready' ? 'cost-benefit' : priority
      },
      usageType,
      components: currentBuildIds
    }),
    null
  );
  const suggestions = buildUpgradeSuggestions({
    currentBuild,
    currentBuildIds,
    bottleneckAnalysis,
    recommendationReference,
    usageType,
    priority,
    budget
  });

  return {
    methodology: buildDecisionMethodology({ usageType, ranking: 'Ganho de indice simulado, custo estimado integral da peca, prioridade, capacidade preservada e compatibilidade pelas regras do catalogo. Nao desconta revenda da peca antiga.' }),
    currentBuildSummary: {
      totalEstimatedPrice: Number(calculateTotalPrice(currentBuild).toFixed(2)),
      mainBottleneck: getMainBottleneck(bottleneckAnalysis),
      hasBottleneck: bottleneckAnalysis?.hasBottleneck === true
    },
    suggestions,
    summary: buildUpgradeSummary(suggestions, bottleneckAnalysis)
  };
}

function buildUpgradeSuggestions({
  currentBuild,
  currentBuildIds,
  bottleneckAnalysis,
  recommendationReference,
  usageType,
  priority,
  budget
}) {
  const performanceByComponentId = new Map(
    listPerformanceParameters().map((parameter) => [parameter.componentId, parameter])
  );
  const prioritySlots = getUpgradePrioritySlots({ usageType, bottleneckAnalysis });
  const suggestions = [];

  for (const slot of prioritySlots) {
    const suggestion = findBestSuggestionForSlot({
      slot,
      currentBuild,
      currentBuildIds,
      performanceByComponentId,
      recommendationReference,
      usageType,
      priority,
      budget,
      hasBottleneck: bottleneckAnalysis?.bottlenecks?.some((bottleneck) => bottleneck.component === slot) === true
    });

    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  return suggestions
    .sort((firstSuggestion, secondSuggestion) => secondSuggestion.score - firstSuggestion.score)
    .map(stripInternalScore);
}

function findBestSuggestionForSlot({
  slot,
  currentBuild,
  currentBuildIds,
  performanceByComponentId,
  recommendationReference,
  usageType,
  priority,
  budget,
  hasBottleneck
}) {
  const currentComponent = currentBuild[slot];
  const currentPerformance = performanceByComponentId.get(currentComponent.id);
  const currentScore = getPerformanceScore(currentComponent, currentPerformance, usageType);
  const recommendedComponentId = recommendationReference?.components?.[slot]?.id;
  const candidates = listComponents({ type: slot })
    .filter((candidate) => candidate.id !== currentComponent.id)
    .filter((candidate) => preservesCapacity(slot, currentComponent, candidate))
    .map((candidate) => buildCandidateSuggestion({
      candidate,
      slot,
      currentBuildIds,
      currentComponent,
      currentScore,
      performanceByComponentId,
      usageType,
      priority,
      budget,
      hasBottleneck,
      recommendedComponentId
    }))
    .filter(Boolean)
    .sort((firstCandidate, secondCandidate) => secondCandidate.score - firstCandidate.score);

  return candidates[0] || null;
}

function buildCandidateSuggestion({
  candidate,
  slot,
  currentBuildIds,
  currentComponent,
  currentScore,
  performanceByComponentId,
  usageType,
  priority,
  budget,
  hasBottleneck,
  recommendedComponentId
}) {
  const candidatePerformance = performanceByComponentId.get(candidate.id);
  const candidateScore = getPerformanceScore(candidate, candidatePerformance, usageType);
  const scoreGain = Number((candidateScore - currentScore).toFixed(2));

  if (scoreGain <= 0) {
    return null;
  }

  const referencePrice = getEstimatedPrice(candidate);
  if (referencePrice === null) return null;
  const estimatedUpgradeCost = Number(referencePrice.toFixed(2));

  if (budget && estimatedUpgradeCost > budget.amount) {
    return null;
  }

  const upgradedBuildIds = {
    ...currentBuildIds,
    [slot]: candidate.id
  };
  const compatibility = runOptionalAnalysis(() => checkBuildCompatibility(upgradedBuildIds), null);

  if (!compatibility?.compatible) {
    return null;
  }

  const costBenefitScore = calculateCostBenefitScore(candidate, candidatePerformance, {
    usageType,
    slotWeight: usageSlotWeights[usageType]?.[slot] ?? 1
  });
  const expectedImpact = getUpgradeImpact(scoreGain);
  const explanation = generateExplanation({
    type: 'recommendation',
    data: {
      component: slot,
      priority,
      usageType
    }
  });

  return {
    componentType: slot,
    currentComponent,
    suggestedComponent: candidate,
    estimatedUpgradeCost,
    estimatedCostBasis: 'full_replacement_reference_price',
    performanceBasis: 'simulated_score_difference',
    expectedImpact,
    scoreGain,
    reason: buildUpgradeReason({
      componentType: slot,
      expectedImpact,
      usageType,
      hasBottleneck
    }),
    explanation,
    compatibilityStatus: 'compatible',
    score: calculateSuggestionScore({
      scoreGain,
      costBenefitScore,
      estimatedUpgradeCost,
      priority,
      budget,
      hasBottleneck,
      isRecommendedReference: candidate.id === recommendedComponentId
    })
  };
}

function calculateSuggestionScore({
  scoreGain,
  costBenefitScore,
  estimatedUpgradeCost,
  priority,
  budget,
  hasBottleneck,
  isRecommendedReference
}) {
  const budgetFitBonus = budget ? Math.max((budget.amount - estimatedUpgradeCost) / budget.amount, 0) * 10 : 0;
  const bottleneckBonus = hasBottleneck ? 20 : 0;
  const recommendationBonus = isRecommendedReference ? 8 : 0;

  if (priority === 'performance') {
    return (scoreGain * 3) + bottleneckBonus + recommendationBonus;
  }

  if (priority === 'lowest-price') {
    return budgetFitBonus + scoreGain + bottleneckBonus + recommendationBonus;
  }

  return (scoreGain * 2) + (costBenefitScore * 100) + budgetFitBonus + bottleneckBonus + recommendationBonus;
}

function resolveBuildInput(input) {
  if (input.buildId) {
    const savedBuild = getSavedBuildById(input.buildId);

    return savedBuild.components;
  }

  if (input.build) {
    return input.build;
  }

  const error = new Error('Informe uma build salva ou uma build direta para sugerir upgrades.');
  error.statusCode = 400;
  throw error;
}

function normalizeBuildInput(buildInput) {
  buildInput = { ...buildInput.components, ...buildInput };
  return {
    ...buildInput,
    cpuId: buildInput.cpuId ?? buildInput.cpu,
    motherboardId: buildInput.motherboardId ?? buildInput.motherboard,
    gpuId: buildInput.gpuId ?? buildInput.gpu,
    ramId: buildInput.ramId ?? buildInput.ram,
    storageId: buildInput.storageId ?? buildInput.storage,
    psuId: buildInput.psuId ?? buildInput.psu,
    caseId: buildInput.caseId ?? buildInput.case
  };
}

function validateUpgradePayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('Informe os dados para sugerir upgrades.');
    error.statusCode = 400;
    throw error;
  }
}

function getMainBottleneck(bottleneckAnalysis) {
  if (!bottleneckAnalysis?.hasBottleneck) {
    return null;
  }

  return bottleneckAnalysis.bottlenecks[0]?.component ?? null;
}

function buildUpgradeSummary(suggestions, bottleneckAnalysis) {
  if (suggestions.length === 0) {
    return 'Nao foram encontrados upgrades compativeis no catalogo dentro das restricoes e custos estimados informados.';
  }

  const firstSuggestion = suggestions[0];

  if (bottleneckAnalysis?.hasBottleneck) {
    return `Entre os candidatos do catalogo, o upgrade sugerido e trocar ${firstSuggestion.componentType}, pois esse ponto aparece como limitador na simulacao.`;
  }

  return `Entre os candidatos do catalogo, o upgrade sugerido e trocar ${firstSuggestion.componentType}, pois oferece o melhor ganho simulado encontrado para o perfil informado, com custo de referencia estimado.`;
}

function mapBuildToIds(build) {
  return serializeBuildSelection(build);
}

function calculateTotalPrice(build) {
  return calculateBuildPrice(build);
}

function stripInternalScore(suggestion) {
  const publicSuggestion = { ...suggestion };
  delete publicSuggestion.score;

  return publicSuggestion;
}

function runOptionalAnalysis(callback, fallbackValue) {
  try {
    return callback();
  } catch (error) {
    if (!error.statusCode || error.statusCode >= 500) {
      throw error;
    }

    return fallbackValue;
  }
}

function normalizeText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim().toLowerCase();
}

function preservesCapacity(slot, currentComponent, candidate) {
  const field = { storage: 'capacityGb', ram: 'capacityGb', gpu: 'vramGb' }[slot];
  if (!field || !Number.isFinite(currentComponent.specs?.[field])) return true;
  const candidateCapacity = candidate.specs?.[field];
  return Number.isFinite(candidateCapacity) && candidateCapacity >= currentComponent.specs[field];
}
