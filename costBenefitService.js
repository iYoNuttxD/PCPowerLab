import { listComponents } from './component.service.js';
import { listPerformanceParameters } from './performanceParametersService.js';
import {
  buildCostBenefitSummary,
  calculateRawCostBenefitRatio,
  classifyCostBenefitScore,
  getEstimatedPrice,
  normalizeCostBenefitRatio
} from '../utils/costBenefitUtils.js';

export function listComponentsByCostBenefit(filters = {}) {
  const category = normalizeCategory(filters.category ?? filters.type);
  const limit = normalizeLimit(filters.limit);
  const components = listComponents(category ? { category } : {});
  const performanceByComponentId = new Map(
    listPerformanceParameters().map((parameter) => [parameter.componentId, parameter])
  );

  const rankedByCategory = groupComponentsByCategory(components)
    .flatMap(([, categoryComponents]) => rankCategoryComponents({
      components: categoryComponents,
      performanceByComponentId
    }));

  const rankedComponents = category
    ? rankedByCategory.sort(compareCostBenefitEntries)
    : rankedByCategory.sort(compareCostBenefitEntriesWithoutCrossCategoryRanking);

  return limit ? rankedComponents.slice(0, limit) : rankedComponents;
}

function rankCategoryComponents({ components, performanceByComponentId }) {
  const eligibleEntries = components
    .map((component) => buildCostBenefitEntry(component, performanceByComponentId.get(component.id)))
    .filter(Boolean);

  if (eligibleEntries.length === 0) {
    return [];
  }

  const highestRatio = Math.max(...eligibleEntries.map((entry) => entry.rawCostBenefitRatio));

  return eligibleEntries
    .map((entry) => {
      const costBenefitScore = normalizeCostBenefitRatio(entry.rawCostBenefitRatio, highestRatio);

      return {
        component: entry.component,
        performanceScore: entry.performanceScore,
        costBenefitScore,
        classification: classifyCostBenefitScore(costBenefitScore),
        summary: buildCostBenefitSummary({
          component: entry.component,
          performanceScore: entry.performanceScore,
          costBenefitScore
        })
      };
    })
    .sort(compareCostBenefitEntries);
}

function buildCostBenefitEntry(component, performanceParameter) {
  const price = getEstimatedPrice(component);
  const performanceScore = performanceParameter?.performanceScore;

  if (!price || !Number.isFinite(performanceScore)) {
    return null;
  }

  return {
    component: {
      id: component.id,
      name: component.name,
      category: component.category,
      price
    },
    performanceScore,
    rawCostBenefitRatio: calculateRawCostBenefitRatio(performanceScore, price)
  };
}

function groupComponentsByCategory(components) {
  const groups = new Map();

  for (const component of components) {
    const categoryComponents = groups.get(component.category) ?? [];
    categoryComponents.push(component);
    groups.set(component.category, categoryComponents);
  }

  return [...groups.entries()];
}

function compareCostBenefitEntries(entryA, entryB) {
  if (entryB.costBenefitScore !== entryA.costBenefitScore) {
    return entryB.costBenefitScore - entryA.costBenefitScore;
  }

  if (entryB.performanceScore !== entryA.performanceScore) {
    return entryB.performanceScore - entryA.performanceScore;
  }

  return entryA.component.price - entryB.component.price;
}

function compareCostBenefitEntriesWithoutCrossCategoryRanking(entryA, entryB) {
  if (entryA.component.category !== entryB.component.category) {
    return entryA.component.category.localeCompare(entryB.component.category);
  }

  return compareCostBenefitEntries(entryA, entryB);
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
    const error = new Error('Limite inválido.');
    error.statusCode = 400;
    error.errors = ['limit deve ser um número inteiro maior que zero.'];
    throw error;
  }

  return parsedLimit;
}
