import { componentTypes } from './componentLabels.js';

export function buildToApiPayload(selectedComponents) {
  return {
    cpuId: getComponentId(selectedComponents, 'cpu'),
    gpuId: getComponentId(selectedComponents, 'gpu'),
    motherboardId: getComponentId(selectedComponents, 'motherboard'),
    ramId: getComponentId(selectedComponents, 'ram'),
    storageId: getComponentId(selectedComponents, 'storage'),
    psuId: getComponentId(selectedComponents, 'psu'),
    caseId: getComponentId(selectedComponents, 'case')
  };
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
    budget: budget?.amount ? normalizeBudgetPayload(budget) : undefined,
    usageType
  };
}

export function normalizeBudgetPayload(budget) {
  return {
    amount: Number(budget?.amount),
    currency: budget?.currency || 'BRL',
    priority: budget?.priority || 'cost-benefit'
  };
}

export function normalizeRecommendationBudgetPayload(budget) {
  const priority = ['cost-benefit', 'performance', 'lowest-price'].includes(budget?.priority)
    ? budget.priority
    : 'cost-benefit';

  return {
    amount: Number(budget?.amount),
    currency: budget?.currency || 'BRL',
    priority
  };
}

export function buildToPurchaseLinksPayload(selectedComponents) {
  return {
    components: buildToApiPayload(selectedComponents)
  };
}

export function limitText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function getComponentId(selectedComponents, type) {
  const nestedComponents = selectedComponents?.components || {};
  const component = selectedComponents?.[type]
    ?? selectedComponents?.[`${type}Id`]
    ?? nestedComponents[type]
    ?? nestedComponents[`${type}Id`];

  if (typeof component === 'string') {
    return component;
  }

  return component?.id || '';
}
