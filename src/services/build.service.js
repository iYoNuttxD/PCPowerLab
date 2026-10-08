import { findComponentById } from './component.service.js';

export const requiredBuildSlots = ['cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'case'];
export const optionalBuildSlots = ['cooler'];

const slotInputFields = {
  cpu: 'cpuId',
  motherboard: 'motherboardId',
  gpu: 'gpuId',
  ram: 'ramId',
  storage: 'storageId',
  psu: 'psuId',
  case: 'caseId',
  cooler: 'coolerId'
};

export function selectBuildComponents(selectionInput) {
  validateSelectionPayload(selectionInput);

  const selectedComponentIds = normalizeSelectedComponentIds(selectionInput);
  validateRequiredSlots(selectedComponentIds);

  const build = requiredBuildSlots.reduce((build, slot) => {
    const componentId = selectedComponentIds[slot];
    if (!componentId && optionalBuildSlots.includes(slot)) return build;
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
  return { ...build, ...selectOptionalBuildComponents(selectionInput) };
}

export function selectOptionalBuildComponents(selectionInput = {}) {
  validateSelectionPayload(selectionInput);
  const build = {};
  const nested = selectionInput.components || {};
  const rawCooler = Object.hasOwn(selectionInput, 'coolerId') ? selectionInput.coolerId
    : Object.hasOwn(selectionInput, 'cooler') ? selectionInput.cooler
      : Object.hasOwn(nested, 'cooler') ? nested.cooler : nested.coolerId;
  if (rawCooler !== undefined && rawCooler !== null) {
    const id = normalizeText(rawCooler);
    if (!id) {
      const error = new Error('coolerId deve ser um ID valido ou null.');
      error.statusCode = 400;
      throw error;
    }
    const component = findComponentById(id);
    if (!component) throwComponentNotFoundError('cooler', id);
    if (component.category !== 'cooler') throwInvalidSlotError('cooler', component);
    build.cooler = component;
  }
  const fans = Object.hasOwn(selectionInput, 'fans') ? selectionInput.fans : selectionInput.components?.fans;
  if (fans !== undefined && fans !== null) {
    if (!Array.isArray(fans) || fans.length > 20) invalidFans();
    const seen = new Set();
    const selectedFans = fans.map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)
        || !normalizeText(entry.fanId) || !Number.isInteger(entry.quantity)
        || entry.quantity < 1 || entry.quantity > 20 || seen.has(entry.fanId.trim())) invalidFans();
      const id = entry.fanId.trim();
      seen.add(id);
      const fan = findComponentById(id);
      if (!fan) throwComponentNotFoundError('fan', id);
      if (fan.category !== 'fan') throwInvalidSlotError('fan', fan);
      return { ...fan, quantity: entry.quantity };
    });
    if (selectedFans.length) build.fans = selectedFans;
  }
  return build;
}

function invalidFans() {
  const error = new Error('Fans invalidos: informe fanId unico e quantity inteira entre 1 e 20 (packs).');
  error.statusCode = 400;
  throw error;
}

// Each fan price is a pack price; repeated entries account for purchased packs.
export function allBuildComponents(build) {
  return [...requiredBuildSlots, ...optionalBuildSlots].map((slot) => build[slot]).filter(Boolean)
    .concat((build.fans || []).flatMap((fan) => Array.from({ length: fan.quantity }, () => fan)));
}

export function calculateBuildPrice(build) {
  const items = allBuildComponents(build);
  const missingPrices = items.filter(component => typeof component.price !== 'number' || !Number.isFinite(component.price) || component.price < 0);
  if (missingPrices.length) {
    const error = new Error('Total indisponivel: ha componentes sem preco de referencia valido.');
    error.statusCode = 422;
    error.errors = [...new Set(missingPrices.map(component => `Preco nao informado: ${component.name} (${component.id}).`))];
    throw error;
  }
  return Number(items.reduce((total, component) => total + component.price, 0).toFixed(2));
}

export function serializeBuildSelection(build) {
  const selection = Object.fromEntries([...requiredBuildSlots, ...optionalBuildSlots]
    .filter((slot) => build[slot]).map((slot) => [slot, build[slot].id]));
  if (build.fans?.length) selection.fans = build.fans.map((fan) => ({ fanId: fan.id, quantity: fan.quantity }));
  return selection;
}

function validateSelectionPayload(selectionInput) {
  if (!selectionInput || typeof selectionInput !== 'object' || Array.isArray(selectionInput)) {
    const error = new Error('Informe os componentes selecionados.');
    error.statusCode = 400;
    throw error;
  }
}

export function normalizeSelectedComponentIds(selectionInput) {
  const nestedComponents = selectionInput.components && typeof selectionInput.components === 'object'
    ? selectionInput.components
    : {};

  return [...requiredBuildSlots, ...optionalBuildSlots].reduce((selectedComponentIds, slot) => {
    const inputField = slotInputFields[slot];

    return {
      ...selectedComponentIds,
      [slot]: normalizeText(selectionInput[inputField] ?? selectionInput[slot] ?? nestedComponents[slot] ?? nestedComponents[inputField])
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