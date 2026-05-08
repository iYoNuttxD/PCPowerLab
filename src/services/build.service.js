import { findComponentById } from './component.service.js';

export const requiredBuildSlots = ['cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'case'];
export const optionalBuildSlots = [];

const slotInputFields = {
  cpu: 'cpuId',
  motherboard: 'motherboardId',
  gpu: 'gpuId',
  ram: 'ramId',
  storage: 'storageId',
  psu: 'psuId',
  case: 'caseId'
};

export function selectBuildComponents(selectionInput) {
  validateSelectionPayload(selectionInput);

  const selectedComponentIds = normalizeSelectedComponentIds(selectionInput);
  validateRequiredSlots(selectedComponentIds);

  return requiredBuildSlots.reduce((build, slot) => {
    const componentId = selectedComponentIds[slot];
    const component = findComponentById(componentId);

    if (!component) {
      throwComponentNotFoundError(slot, componentId);
    }

    if (component.category !== slot) {
      throwInvalidSlotError(slot, component);
    }

    return {
      ...build,
      [slot]: component
    };
  }, {});
}

function validateSelectionPayload(selectionInput) {
  if (!selectionInput || typeof selectionInput !== 'object' || Array.isArray(selectionInput)) {
    const error = new Error('Informe os componentes selecionados.');
    error.statusCode = 400;
    throw error;
  }
}

function normalizeSelectedComponentIds(selectionInput) {
  const nestedComponents = selectionInput.components && typeof selectionInput.components === 'object'
    ? selectionInput.components
    : {};

  return requiredBuildSlots.reduce((selectedComponentIds, slot) => {
    const inputField = slotInputFields[slot];

    return {
      ...selectedComponentIds,
      [slot]: normalizeText(selectionInput[inputField] ?? nestedComponents[slot] ?? nestedComponents[inputField])
    };
  }, {});
}

function validateRequiredSlots(selectedComponentIds) {
  const missingSlots = requiredBuildSlots.filter((slot) => !selectedComponentIds[slot]);

  if (missingSlots.length === 0) {
    return;
  }

  const error = new Error('Selecao de componentes incompleta.');
  error.statusCode = 400;
  error.errors = missingSlots.map((slot) => `Componente obrigatorio ausente: ${slotInputFields[slot]}.`);
  throw error;
}

function throwComponentNotFoundError(slot, componentId) {
  const error = new Error('Um ou mais componentes selecionados nao foram encontrados.');
  error.statusCode = 404;
  error.errors = [`Componente nao encontrado para ${slot}: ${componentId}.`];
  throw error;
}

function throwInvalidSlotError(slot, component) {
  const error = new Error('Componente selecionado em categoria incorreta.');
  error.statusCode = 400;
  error.errors = [`O componente ${component.name} pertence a categoria ${component.category}, nao a ${slot}.`];
  throw error;
}

function normalizeText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}