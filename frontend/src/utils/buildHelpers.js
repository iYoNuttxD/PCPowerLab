import { componentTypes } from './componentLabels.js';

export function buildToApiPayload(selectedComponents) {
  return {
    cpuId: getComponentId(selectedComponents, 'cpu'),
    gpuId: getComponentId(selectedComponents, 'gpu'),
    motherboardId: getComponentId(selectedComponents, 'motherboard'),
    ramId: getComponentId(selectedComponents, 'ram'),
    storageId: getComponentId(selectedComponents, 'storage'),
    psuId: getComponentId(selectedComponents, 'psu'),
    caseId: getComponentId(selectedComponents, 'case'),
    ...(getComponentId(selectedComponents, 'cooler') ? { coolerId: getComponentId(selectedComponents, 'cooler') } : {}),
    fans: (selectedComponents?.fans || selectedComponents?.components?.fans || []).map(fan => ({ fanId: fan.fanId || fan.id, quantity: Number(fan.quantity ?? 1) }))
  };
}

export function savedBuildToSelection(savedBuild) {
  const components = savedBuild?.components || {};

  return {
    ...[...componentTypes, 'cooler'].reduce((selection, type) => ({
      ...selection,
      [type]: components[type] || components[`${type}Id`] || ''
    }), {}),
    fans: Array.isArray(components.fans) ? components.fans : []
  };
}

export function calculateBuildPrice(selectedComponents) {
  const parts = [...componentTypes, 'cooler'].map(type => selectedComponents?.[type]).filter(Boolean);
  const fans = selectedComponents?.fans || [];
  if ([...parts, ...fans].some(component => componentPrice(component) === null)) return null;
  const total = parts.reduce((total, component) => total + componentPrice(component), 0)
    + fans.reduce((total, fan) => total + componentPrice(fan) * Number(fan.quantity ?? 1), 0);
  // Match the backend monetary boundary before comparing with a centavo budget.
  return Number(total.toFixed(2));
}

function componentPrice(component) {
  const price = component?.price ?? component?.estimatedPrice;
  return price !== null && price !== undefined && price !== '' && Number.isFinite(Number(price)) && Number(price) >= 0 ? Number(price) : null;
}

export function fanPackPrice(fan) {
  const price = componentPrice(fan);
  return price === null ? null : price * Number(fan.quantity ?? 1);
}

export function hydrateBuildComponents(components = {}, componentMap = {}, { preferCatalog = false } = {}) {
  components = components && typeof components === 'object' && !Array.isArray(components) ? components : {};
  const selection = [...componentTypes, 'cooler'].reduce((result, type) => {
    const value = components[type] || components[`${type}Id`];
    const id = typeof value === 'string' ? value : value?.id;
    if (typeof id === 'string' && id.trim()) result[type] = { ...(preferCatalog ? { ...(typeof value === 'object' ? value : {}), ...componentMap[id] } : { ...componentMap[id], ...(typeof value === 'object' ? value : {}) }), id };
    return result;
  }, {});
  selection.fans = (Array.isArray(components.fans) ? components.fans : []).filter(fan => {
    const id = fan?.fanId || fan?.id;
    const quantity = Number(fan?.quantity ?? 1);
    return typeof id === 'string' && id.trim() && Number.isSafeInteger(quantity) && quantity > 0;
  }).map(fan => {
    const id = fan.fanId || fan.id;
    const { fanId: _fanId, ...details } = fan;
    return { ...(preferCatalog ? { ...details, ...componentMap[id] } : { ...componentMap[id], ...details }), id, quantity: Number(fan.quantity ?? 1) };
  });
  return selection;
}

export function recommendationSelection(current = {}, recommended = {}, replaceCooling = false) {
  return hydrateBuildComponents({
    ...(!replaceCooling && !Object.hasOwn(recommended, 'cooler') && !Object.hasOwn(recommended, 'coolerId') ? { cooler: current.cooler } : {}),
    ...(!replaceCooling && !Object.hasOwn(recommended, 'fans') ? { fans: current.fans || [] } : {}),
    ...recommended
  });
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
