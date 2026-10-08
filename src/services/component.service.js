import { findPerformanceParameterRecordByComponentId } from '../data/performance-parameter.repository.js';
import {
  findComponentRecordById,
  listComponentRecords
} from '../data/component.repository.js';
import { componentCategories, isValidComponentCategory } from '../models/component.model.js';

export function listComponents(filters = {}) {
  const category = normalizeCategoryFilter(filters.type ?? filters.category);

  if (!category) {
    return listComponentRecords().map(withCatalogPerformance);
  }

  validateComponentCategory(category);

  return listComponentRecords().filter((component) => component.category === category).map(withCatalogPerformance);
}

export function findComponentById(componentId) {
  return findComponentRecordById(componentId);
}

export function findComponentsByIds(componentIds) {
  return componentIds.map((componentId) => findComponentById(componentId));
}

function normalizeCategoryFilter(category) {
  if (!category || typeof category !== 'string') {
    return null;
  }

  return category.trim().toLowerCase();
}

function validateComponentCategory(category) {
  if (isValidComponentCategory(category)) {
    return;
  }

  const error = new Error('Categoria de componente inválida.');
  error.statusCode = 400;
  error.errors = [`Categorias aceitas: ${componentCategories.join(', ')}.`];
  throw error;
}

export function withCatalogPerformance(component) {
  const parameter = ['cpu', 'gpu', 'ram', 'storage'].includes(component.category)
    ? findPerformanceParameterRecordByComponentId(component.id) : null;
  const score = parameter?.performanceScore;
  const performanceScore = typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
  return { ...component, performanceScore,
    performanceMethodology: performanceScore === null ? null
      : 'Indice interno estimado de 0 a 100; compare apenas pecas da mesma categoria. Nao representa benchmark medido nem FPS.' };
}
