export const savedBuildRequiredComponentSlots = [
  'cpu',
  'motherboard',
  'gpu',
  'ram',
  'storage',
  'psu',
  'case'
];

export const savedBuildSlotInputFields = {
  cpu: 'cpuId',
  motherboard: 'motherboardId',
  gpu: 'gpuId',
  ram: 'ramId',
  storage: 'storageId',
  psu: 'psuId',
  case: 'caseId'
};

export function normalizeSavedBuildComponents(componentsInput) {
  if (!componentsInput || typeof componentsInput !== 'object' || Array.isArray(componentsInput)) {
    return {};
  }

  const normalized = savedBuildRequiredComponentSlots.reduce((normalizedComponents, slot) => {
    const inputField = savedBuildSlotInputFields[slot];
    const componentId = normalizeText(componentsInput[slot] ?? componentsInput[inputField]);

    if (!componentId) {
      return normalizedComponents;
    }

    return {
      ...normalizedComponents,
      [slot]: componentId
    };
  }, {});
  if (Object.hasOwn(componentsInput, 'cooler') || Object.hasOwn(componentsInput, 'coolerId')) {
    normalized.cooler = componentsInput.cooler ?? componentsInput.coolerId ?? null;
  }
  if (Object.hasOwn(componentsInput, 'fans')) {
    normalized.fans = JSON.parse(JSON.stringify(componentsInput.fans));
  }
  return normalized;
}

export function normalizeText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

export function hasRequiredSavedBuildComponents(components) {
  return savedBuildRequiredComponentSlots.every((slot) => Boolean(components[slot]));
}
