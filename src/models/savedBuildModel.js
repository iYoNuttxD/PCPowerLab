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

  return savedBuildRequiredComponentSlots.reduce((normalizedComponents, slot) => {
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
