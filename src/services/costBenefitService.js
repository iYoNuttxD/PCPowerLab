import { buildDecisionMethodology } from '../utils/decisionMethodology.js';
import { listComponents } from './component.service.js';
import { listPerformanceParameters } from './performanceParametersService.js';
import { componentCategories } from '../models/component.model.js';
import {
  buildCostBenefitSummary,
  classifyCostBenefitScore,
  getEstimatedPrice
} from '../utils/costBenefitUtils.js';

export function listComponentsByCostBenefit(filters = {}) {
  const category = normalizeCategory(filters.category);
  const limit = normalizeLimit(filters.limit);

  const components = listComponents({ category });
  if (['cooler', 'fan'].includes(category)) return [];
  const performanceByComponentId = new Map(
    listPerformanceParameters({ type: category }).map((parameter) => [parameter.componentId, parameter])
  );

  const componentsByCategory = groupComponentsByCategory(components);
  const rankedComponents = componentCategories.flatMap((currentCategory) => {
    const categoryComponents = componentsByCategory.get(currentCategory) || [];

    return rankCategoryComponents(categoryComponents, performanceByComponentId);
  });

  const orderedComponents = rankedComponents.sort(compareRankedComponents);

  if (limit === null) {
    return orderedComponents;
  }

  return orderedComponents.slice(0, limit);
}

function rankCategoryComponents(components, performanceByComponentId) {
  const validEntries = components
    .map((component) => buildCostBenefitEntry(component, performanceByComponentId.get(component.id)))
    .filter(Boolean);

  if (validEntries.length === 0) {
    return [];
  }

  const maxRawScore = Math.max(...validEntries.map((entry) => entry.rawCostBenefitScore));

  return validEntries
    .map((entry) => formatCostBenefitEntry(entry, maxRawScore))
    .sort(compareRankedComponents)
    .map((entry, index) => ({
      ...entry,
      categoryRank: index + 1
    }));
}

function buildCostBenefitEntry(component, performanceParameter) {
  if (['cooler', 'fan'].includes(component.category)) {
    return null;
  }

  const price = getEstimatedPrice(component);
  const performanceScore = performanceParameter?.performanceScore;

  if (!price || !Number.isFinite(performanceScore) || performanceScore <= 0) {
    return null;
  }

  return {
    component,
    performanceScore,
    rawCostBenefitScore: performanceScore / price
  };
}

function formatCostBenefitEntry(entry, maxRawScore) {
  const costBenefitScore = normalizeCostBenefitScore(entry.rawCostBenefitScore, maxRawScore);

  return {
    component: {
      id: entry.component.id,
      name: entry.component.name,
      category: entry.component.category,
      price: entry.component.price,
      estimatedPrice: getEstimatedPrice(entry.component),
      specs: entry.component.specs,
      priceBasis: 'catalog_reference_estimate'
    },
    methodology: buildDecisionMethodology({ scope: 'same_category_catalog_entries', fallbackScore: null, ranking: 'Indice simulado de desempenho dividido pelo preco estimado, normalizado pelo maior resultado da mesma categoria para 0–100. As posicoes sao relativas a categoria, nao ao mercado.' }),
    performanceScore: entry.performanceScore,
    costBenefitScore,
    classification: classifyCostBenefitScore(costBenefitScore),
    summary: buildCostBenefitSummary(entry.component, costBenefitScore)
  };
}

function normalizeCostBenefitScore(rawScore, maxRawScore) {
  if (!Number.isFinite(rawScore) || rawScore <= 0 || !Number.isFinite(maxRawScore) || maxRawScore <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((rawScore / maxRawScore) * 100));
}

function groupComponentsByCategory(components) {
  return components.reduce((groups, component) => {
    const categoryComponents = groups.get(component.category) || [];
    categoryComponents.push(component);
    groups.set(component.category, categoryComponents);

    return groups;
  }, new Map());
}

function compareRankedComponents(componentA, componentB) {
  if (componentB.costBenefitScore !== componentA.costBenefitScore) {
    return componentB.costBenefitScore - componentA.costBenefitScore;
  }

  if (componentB.performanceScore !== componentA.performanceScore) {
    return componentB.performanceScore - componentA.performanceScore;
  }

  return componentA.component.estimatedPrice - componentB.component.estimatedPrice;
}

function normalizeCategory(category) {
  if (!category || typeof category !== 'string') {
    return null;
  }

  return category.trim().toLowerCase();
}

function normalizeLimit(limit) {
  if (limit === undefined || limit === null || limit === '') {
    return null;
  }

  const parsedLimit = Number(limit);

  if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
    const error = new Error('Limit invalido.');
    error.statusCode = 400;
    error.errors = ['Informe um limit numerico inteiro maior que zero.'];
    throw error;
  }

  return parsedLimit;
}
