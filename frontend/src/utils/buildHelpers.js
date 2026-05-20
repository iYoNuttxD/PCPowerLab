import { componentTypes } from './componentLabels.js';

export function buildToApiPayload(selectedComponents) {
  return componentTypes.reduce((payload, type) => ({
    ...payload,
    [`${type}Id`]: selectedComponents?.[type]?.id || selectedComponents?.[type] || ''
  }), {});
}

export function savedBuildToSelection(savedBuild) {
  const components = savedBuild?.components || {};

  return componentTypes.reduce((selection, type) => ({
    ...selection,
    [type]: components[type] || components[`${type}Id`] || ''
  }), {});
}

export function calculateBuildPrice(selectedComponents) {
  return Object.values(selectedComponents || {}).reduce((total, component) => (
    total + (Number(component?.price) || Number(component?.estimatedPrice) || 0)
  ), 0);
}

export function hasCompleteBuild(selectedComponents) {
  return componentTypes.every((type) => selectedComponents?.[type]?.id || selectedComponents?.[type]);
}

export function normalizeSavedBuildPayload({ name, description, selectedComponents, budget, usageType }) {
  return {
    name: limitText(name || 'Minha build PCPowerLab', 80),
    description: limitText(description || '', 180),
    components: buildToApiPayload(selectedComponents),
    budget,
    usageType
  };
}

export function limitText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}
