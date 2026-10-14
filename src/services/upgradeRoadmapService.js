import { performanceMetadata } from '../utils/performanceMethodology.js';
import { selectBuildComponents, serializeBuildSelection, calculateBuildPrice } from './build.service.js';
import { analyzeBuildBottlenecks } from './bottleneck.service.js';
import { checkBuildCompatibility } from './compatibility.service.js';
import { listPerformanceParameters } from './performanceParametersService.js';
import { recommendBuildByBudget } from './recommendationService.js';
import { suggestUpgrades } from './upgradeSuggestionService.js';

const defaultUsageType = 'general';
const defaultPriority = 'cost-benefit';
const defaultMaxSteps = 3;
const maxAllowedSteps = 5;

const impactWeights = {
  high: 3,
  medium: 2,
  low: 1
};

const priorityWeights = {
  high: 3,
  medium: 2,
  low: 1
};

export function generateUpgradeRoadmap(input) {
  validateRoadmapPayload(input);

  const buildInput = normalizeBuildInput(input.build);
  const totalBudget = normalizeTotalBudget(input.totalBudget);
  const maxSteps = normalizeMaxSteps(input.maxSteps);
  const usageType = normalizeText(input.usageType) || defaultUsageType;
  const priority = normalizeText(input.priority) || defaultPriority;
  const currentBuild = selectBuildComponents(buildInput);
  const initialBuildIds = mapBuildToIds(currentBuild);
  const initialCompatibility = runOptionalAnalysis(() => checkBuildCompatibility(initialBuildIds), null);
  const bottleneckAnalysis = runOptionalAnalysis(() => analyzeBuildBottlenecks(buildInput), null);
  const performanceParameters = listPerformanceParameters();
  const recommendationReference = runOptionalAnalysis(
    () => recommendBuildByBudget({
      budget: {
        amount: calculateTotalPrice(currentBuild) + totalBudget,
        currency: 'BRL',
        priority: normalizeRecommendationPriority(priority)
      },
      usageType,
      components: initialBuildIds
    }),
    null
  );
  const upgradeSuggestionResult = suggestUpgrades({
    build: buildInput,
    budget: {
      amount: totalBudget,
      currency: 'BRL',
      priority
    },
    usageType,
    priority
  });
  const steps = buildRoadmapSteps({
    suggestions: upgradeSuggestionResult.suggestions,
    initialBuildIds,
    totalBudget,
    maxSteps,
    bottleneckAnalysis
  });
  const totalEstimatedCost = calculateTotalEstimatedCost(steps);

  return {
    ...performanceMetadata(currentBuild),
    totalBudget,
    maxSteps,
    totalEstimatedCost,
    remainingBudget: Number((totalBudget - totalEstimatedCost).toFixed(2)),
    steps,
    currentBuildSummary: upgradeSuggestionResult.currentBuildSummary,
    initialCompatibility: formatCompatibility(initialCompatibility),
    analysisContext: {
      usageType,
      priority,
      mainBottleneck: getMainBottleneck(bottleneckAnalysis),
      performanceParametersCount: performanceParameters.length,
      recommendationReference: formatRecommendationReference(recommendationReference)
    },
    summary: buildRoadmapSummary({ steps, totalBudget, totalEstimatedCost })
  };
}

function buildRoadmapSteps({ suggestions, initialBuildIds, totalBudget, maxSteps, bottleneckAnalysis }) {
  const orderedSuggestions = [...suggestions]
    .map((suggestion, index) => ({
      suggestion,
      originalPosition: index,
      stepPriority: classifyStepPriority(suggestion, bottleneckAnalysis)
    }))
    .sort(compareRoadmapCandidates);
  const selectedSteps = [];
  let cumulativeCost = 0;
  let buildIdsAfterPreviousSteps = { ...initialBuildIds };

  for (const candidate of orderedSuggestions) {
    if (selectedSteps.length >= maxSteps) {
      break;
    }

    const estimatedCost = normalizeEstimatedCost(candidate.suggestion);

    if (cumulativeCost + estimatedCost > totalBudget) {
      continue;
    }

    const buildIdsAfterStep = {
      ...buildIdsAfterPreviousSteps,
      [candidate.suggestion.componentType]: candidate.suggestion.suggestedComponent.id
    };
    const compatibilityAfterStep = runOptionalAnalysis(() => checkBuildCompatibility(buildIdsAfterStep), null);

    if (!compatibilityAfterStep?.compatible) {
      continue;
    }

    cumulativeCost = Number((cumulativeCost + estimatedCost).toFixed(2));
    selectedSteps.push(formatRoadmapStep({
      candidate,
      stepNumber: selectedSteps.length + 1,
      estimatedCost,
      cumulativeCost,
      compatibilityAfterStep,
      buildIdsAfterStep
    }));
    buildIdsAfterPreviousSteps = buildIdsAfterStep;
  }

  return selectedSteps;
}

function formatRoadmapStep({
  candidate,
  stepNumber,
  estimatedCost,
  cumulativeCost,
  compatibilityAfterStep,
  buildIdsAfterStep
}) {
  const { suggestion, stepPriority } = candidate;

  return removeNullishFields({
    performanceBasis: suggestion.performanceBasis,
    performanceMethodology: suggestion.performanceMethodology,
    step: stepNumber,
    orderRecommended: stepNumber,
    componentType: suggestion.componentType,
    currentComponent: suggestion.currentComponent,
    suggestedComponent: suggestion.suggestedComponent,
    estimatedCost,
    cumulativeCost,
    expectedImpact: suggestion.expectedImpact,
    priority: stepPriority,
    reason: suggestion.reason,
    dependencyWarning: buildDependencyWarning({ suggestion, compatibilityAfterStep }),
    compatibilityAfterStep: formatCompatibility(compatibilityAfterStep),
    buildAfterStep: buildIdsAfterStep
  });
}

function compareRoadmapCandidates(candidateA, candidateB) {
  const impactDifference = getImpactWeight(candidateB.suggestion.expectedImpact)
    - getImpactWeight(candidateA.suggestion.expectedImpact);

  if (impactDifference !== 0) {
    return impactDifference;
  }

  const priorityDifference = priorityWeights[candidateB.stepPriority] - priorityWeights[candidateA.stepPriority];

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return candidateA.originalPosition - candidateB.originalPosition;
}

function classifyStepPriority(suggestion, bottleneckAnalysis) {
  const bottleneckComponents = Array.isArray(bottleneckAnalysis?.bottlenecks)
    ? bottleneckAnalysis.bottlenecks.map((bottleneck) => bottleneck.component)
    : [];

  if (bottleneckComponents.includes(suggestion.componentType) || suggestion.expectedImpact === 'high') {
    return 'high';
  }

  if (suggestion.expectedImpact === 'medium') {
    return 'medium';
  }

  return 'low';
}

function buildDependencyWarning({ suggestion, compatibilityAfterStep }) {
  const alerts = compatibilityAfterStep?.alerts ?? [];

  if (alerts.length > 0) {
    return alerts.map((alert) => alert.message).join(' ');
  }

  if (suggestion.componentType === 'gpu') {
    const recommendedPsuWatts = suggestion.suggestedComponent?.specs?.recommendedPsuWatts;
    const psuWatts = compatibilityAfterStep?.selectedComponents?.psu?.specs?.watts;

    if (Number.isFinite(recommendedPsuWatts) && Number.isFinite(psuWatts) && recommendedPsuWatts === psuWatts) {
      return 'A placa de video sugerida usa a fonte no limite recomendado; considere uma fonte com mais folga em uma etapa futura.';
    }
  }

  return null;
}

function buildRoadmapSummary({ steps, totalBudget, totalEstimatedCost }) {
  if (steps.length === 0) {
    return 'Nao foram encontrados upgrades compativeis dentro do orcamento total informado.';
  }

  const firstStep = steps[0];
  const lastStep = steps[steps.length - 1];
  const remainingBudget = Number((totalBudget - totalEstimatedCost).toFixed(2));

  if (steps.length === 1) {
    return `O plano recomenda iniciar por ${firstStep.componentType}, mantendo compatibilidade e custo estimado de R$ ${totalEstimatedCost}.`;
  }

  return `O plano recomenda iniciar por ${firstStep.componentType} e finalizar com ${lastStep.componentType}, com custo acumulado estimado de R$ ${totalEstimatedCost} e saldo aproximado de R$ ${remainingBudget}.`;
}

function formatCompatibility(compatibility) {
  if (!compatibility) {
    return {
      compatible: false,
      alerts: [],
      available: false
    };
  }

  return {
    compatible: compatibility.compatible,
    status: compatibility.status,
    coolingAssessment: compatibility.coolingAssessment,
    unverifiedChecks: compatibility.unverifiedChecks ?? [],
    alerts: compatibility.alerts ?? [],
    estimatedPrice: compatibility.estimatedPrice,
    pricing: compatibility.pricing
  };
}

function formatRecommendationReference(recommendationReference) {
  if (!recommendationReference) {
    return null;
  }

  return {
    totalEstimatedPrice: recommendationReference.totalEstimatedPrice,
    performanceScore: recommendationReference.performanceScore,
    summary: recommendationReference.summary
  };
}

function validateRoadmapPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('Informe os dados para gerar o plano de upgrades.');
    error.statusCode = 400;
    throw error;
  }

  if (!input.build || typeof input.build !== 'object' || Array.isArray(input.build)) {
    const error = new Error('Informe a build para gerar o plano de upgrades.');
    error.statusCode = 400;
    error.errors = ['build deve ser informada.'];
    throw error;
  }
}

function normalizeTotalBudget(totalBudgetInput) {
  const totalBudget = Number(totalBudgetInput);

  if (!Number.isFinite(totalBudget) || totalBudget <= 0) {
    const error = new Error('Orcamento total invalido.');
    error.statusCode = 400;
    error.errors = ['totalBudget deve ser um numero maior que zero.'];
    throw error;
  }

  return totalBudget;
}

function normalizeMaxSteps(maxStepsInput) {
  if (maxStepsInput === undefined || maxStepsInput === null || maxStepsInput === '') {
    return defaultMaxSteps;
  }

  const maxSteps = Number(maxStepsInput);

  if (!Number.isInteger(maxSteps) || maxSteps <= 0) {
    const error = new Error('Quantidade de etapas invalida.');
    error.statusCode = 400;
    error.errors = ['maxSteps deve ser um numero inteiro maior que zero.'];
    throw error;
  }

  return Math.min(maxSteps, maxAllowedSteps);
}

function normalizeBuildInput(buildInput) {
  return serializeBuildSelection(selectBuildComponents(buildInput));
}

function normalizeRecommendationPriority(priority) {
  return priority === 'balanced' || priority === 'upgrade-ready' ? 'cost-benefit' : priority;
}

function normalizeEstimatedCost(suggestion) {
  return Number((suggestion.estimatedUpgradeCost ?? suggestion.estimatedCost ?? 0).toFixed(2));
}

function getImpactWeight(impact) {
  return impactWeights[impact] ?? 0;
}

function getMainBottleneck(bottleneckAnalysis) {
  if (!bottleneckAnalysis?.hasBottleneck) {
    return null;
  }

  return bottleneckAnalysis.bottlenecks[0]?.component ?? null;
}

function calculateTotalPrice(build) {
  return calculateBuildPrice(build);
}

function calculateTotalEstimatedCost(steps) {
  return Number(steps.reduce((total, step) => total + step.estimatedCost, 0).toFixed(2));
}

function mapBuildToIds(build) {
  return serializeBuildSelection(build);
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

function removeNullishFields(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== null && entryValue !== undefined)
  );
}
