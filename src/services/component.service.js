import { components } from '../data/components.mock.js';
import { componentCategories, isValidComponentCategory } from '../models/component.model.js';

export function listComponents(filters = {}) {
  const category = normalizeCategoryFilter(filters.type ?? filters.category);

  if (!category) {
    return components;
  }

  validateComponentCategory(category);

  return components.filter((component) => component.category === category);
}

export function findComponentById(componentId) {
  return components.find((component) => component.id === componentId) || null;
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
