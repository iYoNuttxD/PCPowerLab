import { components } from '../data/components.mock.js';
import { isValidComponentCategory } from '../models/component.model.js';

export function listComponents(filters = {}) {
  const { category } = filters;

  if (!category) {
    return components;
  }

  if (!isValidComponentCategory(category)) {
    const error = new Error('Categoria de componente inválida.');
    error.statusCode = 400;
    error.errors = [`Categorias aceitas: cpu, gpu, motherboard, ram, storage, psu, case.`];
    throw error;
  }

  return components.filter((component) => component.category === category);
}

export function findComponentById(componentId) {
  return components.find((component) => component.id === componentId) || null;
}

export function findComponentsByIds(componentIds) {
  return componentIds.map((componentId) => findComponentById(componentId));
}
