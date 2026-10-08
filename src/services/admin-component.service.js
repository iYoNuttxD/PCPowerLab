import {
  addComponentRecord,
  deactivateComponentRecord,
  findComponentRecordById,
  listComponentRecords,
  updateComponentRecord
} from '../data/component.repository.js';
import { componentCategories, isNonEmptyTextArray, isValidComponentCategory } from '../models/component.model.js';

const requiredSpecFieldsByCategory = {
  cpu: ['socket', 'cores', 'threads', 'baseClockGhz', 'boostClockGhz', 'tdpWatts'],
  gpu: ['vramGb', 'tdpWatts', 'lengthMm', 'recommendedPsuWatts'],
  motherboard: ['socket', 'memoryType', 'formFactor', 'chipset'],
  ram: ['memoryType', 'capacityGb', 'speedMhz'],
  storage: ['interface', 'capacityGb', 'storageType'],
  psu: ['watts', 'efficiency'],
  case: ['supportedFormFactors', 'maxGpuLengthMm'],
  cooler: ['coolingType'],
  fan: ['unitsPerPack']
};

export function listAdminComponents(filters = {}) {
  const category = normalizeCategory(filters.type ?? filters.category);
  const active = normalizeOptionalBoolean(filters.active);

  validateOptionalCategoryFilter(category);

  return listComponentRecords({ includeInactive: true })
    .filter((component) => !category || component.category === category)
    .filter((component) => active === null || getComponentActive(component) === active);
}

export function findAdminComponentById(componentId) {
  return findComponentRecordById(componentId, { includeInactive: true });
}

export function createAdminComponent(componentInput) {
  validateComponentPayload(componentInput);

  const component = normalizeComponentInput(componentInput);
  validateComponentForSave(component);
  validateDuplicateComponentId(component.id);

  return addComponentRecord(component);
}

export function updateAdminComponent(componentId, componentInput) {
  const currentComponent = findComponentRecordById(componentId, { includeInactive: true });

  if (!currentComponent) {
    throwNotFoundError();
  }

  validateComponentPayload(componentInput);

  const component = normalizeComponentInput(componentInput, currentComponent);
  validateComponentForSave(component);

  return updateComponentRecord(componentId, component);
}

export function deactivateAdminComponent(componentId) {
  const currentComponent = findComponentRecordById(componentId, { includeInactive: true });

  if (!currentComponent) {
    throwNotFoundError();
  }

  if (currentComponent.active === false) {
    return currentComponent;
  }

  return deactivateComponentRecord(componentId);
}

function normalizeComponentInput(componentInput, currentComponent = null) {
  const category = normalizeCategory(componentInput.type ?? componentInput.category ?? currentComponent?.category);
  const specs = normalizeComponentSpecs(category, componentInput, currentComponent?.specs ?? {});

  return {
    id: normalizeText(componentInput.id) || currentComponent?.id || generateComponentId(category),
    name: normalizeText(componentInput.name) || currentComponent?.name,
    category,
    brand: normalizeText(componentInput.brand) || currentComponent?.brand || null,
    price: normalizeNumber(componentInput.estimatedPrice ?? componentInput.price) ?? currentComponent?.price ?? null,
    active: typeof componentInput.active === 'boolean' ? componentInput.active : getComponentActive(currentComponent),
    specs
  };
}

function normalizeComponentSpecs(category, componentInput, currentSpecs) {
  const inputSpecs = componentInput.specs && typeof componentInput.specs === 'object'
    ? componentInput.specs
    : {};
  const specs = { ...currentSpecs };

  if (category === 'cpu') {
    assignSpec(specs, 'socket', componentInput.socket ?? inputSpecs.socket);
    assignSpec(specs, 'cores', componentInput.cores ?? inputSpecs.cores);
    assignSpec(specs, 'threads', componentInput.threads ?? inputSpecs.threads);
    assignSpec(specs, 'baseClockGhz', componentInput.baseClock ?? componentInput.baseClockGhz ?? inputSpecs.baseClock ?? inputSpecs.baseClockGhz);
    assignSpec(specs, 'boostClockGhz', componentInput.boostClock ?? componentInput.boostClockGhz ?? inputSpecs.boostClock ?? inputSpecs.boostClockGhz);
    assignSpec(specs, 'tdpWatts', componentInput.tdp ?? componentInput.tdpWatts ?? inputSpecs.tdp ?? inputSpecs.tdpWatts);
  }

  if (category === 'gpu') {
    assignSpec(specs, 'vramGb', componentInput.vram ?? componentInput.vramGb ?? inputSpecs.vram ?? inputSpecs.vramGb);
    assignSpec(specs, 'tdpWatts', componentInput.tdp ?? componentInput.tdpWatts ?? inputSpecs.tdp ?? inputSpecs.tdpWatts);
    assignSpec(specs, 'lengthMm', componentInput.length ?? componentInput.lengthMm ?? inputSpecs.length ?? inputSpecs.lengthMm);
    assignSpec(specs, 'recommendedPsuWatts', componentInput.recommendedPsu ?? componentInput.recommendedPsuWatts ?? inputSpecs.recommendedPsu ?? inputSpecs.recommendedPsuWatts);
  }

  if (category === 'motherboard') {
    assignSpec(specs, 'socket', componentInput.socket ?? inputSpecs.socket);
    assignSpec(specs, 'memoryType', componentInput.memoryType ?? inputSpecs.memoryType);
    assignSpec(specs, 'formFactor', componentInput.formFactor ?? inputSpecs.formFactor);
    assignSpec(specs, 'chipset', componentInput.chipset ?? inputSpecs.chipset);
    assignSpec(specs, 'storageInterfaces', componentInput.storageInterfaces ?? inputSpecs.storageInterfaces);
  }

  if (category === 'ram') {
    assignSpec(specs, 'memoryType', componentInput.memoryType ?? inputSpecs.memoryType);
    assignSpec(specs, 'capacityGb', componentInput.capacity ?? componentInput.capacityGb ?? inputSpecs.capacity ?? inputSpecs.capacityGb);
    assignSpec(specs, 'speedMhz', componentInput.speed ?? componentInput.speedMhz ?? inputSpecs.speed ?? inputSpecs.speedMhz);
  }

  if (category === 'storage') {
    assignSpec(specs, 'interface', componentInput.interface ?? inputSpecs.interface);
    assignSpec(specs, 'capacityGb', componentInput.capacity ?? componentInput.capacityGb ?? inputSpecs.capacity ?? inputSpecs.capacityGb);
    assignSpec(specs, 'storageType', componentInput.storageType ?? inputSpecs.type ?? inputSpecs.storageType);
  }

  if (category === 'psu') {
    assignSpec(specs, 'watts', componentInput.wattage ?? componentInput.watts ?? inputSpecs.wattage ?? inputSpecs.watts);
    assignSpec(specs, 'efficiency', componentInput.efficiency ?? inputSpecs.efficiency);
  }

  if (category === 'case') {
    assignSpec(specs, 'supportedFormFactors', componentInput.supportedFormFactors ?? inputSpecs.supportedFormFactors);
    assignSpec(specs, 'maxGpuLengthMm', componentInput.maxGpuLength ?? componentInput.maxGpuLengthMm ?? inputSpecs.maxGpuLength ?? inputSpecs.maxGpuLengthMm);
  }

  const coolingFields = {
    cooler: ['coolingType', 'supportedSockets', 'heightMm', 'radiatorSizeMm', 'radiatorThicknessMm', 'powerWatts'],
    fan: ['diameterMm', 'thicknessMm', 'connector', 'powerWatts', 'unitsPerPack'],
    case: ['maxCoolerHeightMm', 'radiatorSizesMm', 'fanMounts', 'includedFanCount', 'maxFanThicknessMm']
  };
  for (const field of coolingFields[category] || []) {
    const value = Object.hasOwn(componentInput, field) ? componentInput[field] : inputSpecs[field];
    assignSpec(specs, field, value);
  }

  return specs;
}

function validateComponentPayload(componentInput) {
  if (!componentInput || typeof componentInput !== 'object' || Array.isArray(componentInput)) {
    const error = new Error('Informe os dados do componente.');
    error.statusCode = 400;
    throw error;
  }
}

function validateComponentForSave(component) {
  const errors = [];

  if (!isFilledText(component.id)) {
    errors.push('id deve ser um texto valido quando informado.');
  }

  if (!isFilledText(component.name)) {
    errors.push('Campo obrigatorio ausente ou invalido: name.');
  }

  if (!isFilledText(component.category)) {
    errors.push('Campo obrigatorio ausente ou invalido: type.');
  } else if (!isValidComponentCategory(component.category)) {
    errors.push(`type invalido. Tipos aceitos: ${componentCategories.join(', ')}.`);
  }

  if (component.active !== undefined && typeof component.active !== 'boolean') {
    errors.push('active deve ser booleano quando informado.');
  }

  if (component.price !== null && !isValidNumber(component.price)) {
    errors.push('estimatedPrice deve ser um numero valido quando informado.');
  }

  if (errors.length === 0) {
    errors.push(...validateRequiredSpecs(component.category, component.specs));
    const arrayField = { motherboard: 'storageInterfaces', case: 'supportedFormFactors' }[component.category];
    if (arrayField && component.specs[arrayField] != null && !isNonEmptyTextArray(component.specs[arrayField])) {
      errors.push(`Campo tecnico invalido para ${component.category}: ${arrayField} deve ser uma lista nao vazia de textos.`);
    }
    errors.push(...validateCoolingSpecs(component.category, component.specs));
  }

  if (errors.length > 0) {
    const error = new Error('Componente invalido.');
    error.statusCode = 400;
    error.errors = errors;
    throw error;
  }
}

function validateRequiredSpecs(category, specs) {
  return requiredSpecFieldsByCategory[category]
    .filter((field) => isEmptySpecValue(specs[field]))
    .map((field) => `Campo tecnico obrigatorio ausente ou invalido para ${category}: ${field}.`);
}

function validateOptionalCategoryFilter(category) {
  if (!category || isValidComponentCategory(category)) {
    return;
  }

  const error = new Error('Categoria de componente invalida.');
  error.statusCode = 400;
  error.errors = [`Categorias aceitas: ${componentCategories.join(', ')}.`];
  throw error;
}

function validateDuplicateComponentId(componentId) {
  const alreadyExists = findComponentRecordById(componentId, { includeInactive: true });

  if (!alreadyExists) {
    return;
  }

  const error = new Error('Ja existe um componente com o ID informado.');
  error.statusCode = 409;
  throw error;
}

function throwNotFoundError() {
  const error = new Error('Componente nao encontrado.');
  error.statusCode = 404;
  throw error;
}

function generateComponentId(category) {
  const nextNumber = listComponentRecords({ includeInactive: true }).length + 1;

  return `${category}-${String(nextNumber).padStart(3, '0')}`;
}

function assignSpec(specs, field, value) {
  if (value !== undefined) {
    specs[field] = value;
  }
}

function normalizeCategory(value) {
  if (!isFilledText(value)) {
    return null;
  }

  return value.trim().toLowerCase();
}

function normalizeText(value) {
  if (!isFilledText(value)) {
    return null;
  }

  return value.trim();
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return Number(value);
}

function normalizeOptionalBoolean(value) {
  if (value === undefined) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  const error = new Error('Filtro active invalido.');
  error.statusCode = 400;
  error.errors = ['Valores aceitos para active: true ou false.'];
  throw error;
}

function getComponentActive(component) {
  if (!component) {
    return true;
  }

  return component.active !== false;
}

function isFilledText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isEmptySpecValue(value) {
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return value === undefined || value === null || value === '';
}

function validateCoolingSpecs(category, specs) {
  const errors = [];
  const invalid = (field) => errors.push(`Campo tecnico invalido para ${category}: ${field}.`);
  const present = (field) => specs[field] !== undefined && specs[field] !== null;
  const positive = (value) => isValidNumber(value) && value > 0;
  const fields = category === 'cooler' ? ['heightMm', 'radiatorSizeMm', 'radiatorThicknessMm']
    : category === 'fan' ? ['diameterMm', 'thicknessMm']
      : category === 'case' ? ['maxCoolerHeightMm', 'maxFanThicknessMm'] : [];
  for (const field of fields) if (present(field) && !positive(specs[field])) invalid(field);
  if (['cooler', 'fan'].includes(category) && present('powerWatts') && !isValidNumber(specs.powerWatts)) invalid('powerWatts');
  if (category === 'cooler') {
    if (!['air', 'aio'].includes(specs.coolingType)) invalid('coolingType');
    if (present('supportedSockets') && (!Array.isArray(specs.supportedSockets) || !specs.supportedSockets.length
      || !specs.supportedSockets.every(isFilledText))) invalid('supportedSockets');
  }
  if (category === 'fan') {
    if (!Number.isInteger(specs.unitsPerPack) || specs.unitsPerPack < 1 || specs.unitsPerPack > 20) invalid('unitsPerPack');
    if (present('connector') && !isFilledText(specs.connector)) invalid('connector');
  }
  if (category === 'case') {
    if (present('includedFanCount') && (!Number.isInteger(specs.includedFanCount) || specs.includedFanCount < 0)) invalid('includedFanCount');
    if (present('radiatorSizesMm') && (!Array.isArray(specs.radiatorSizesMm) || !specs.radiatorSizesMm.every(positive))) invalid('radiatorSizesMm');
    if (present('fanMounts') && (!Array.isArray(specs.fanMounts) || !specs.fanMounts.every((mount) =>
      mount && typeof mount === 'object' && positive(mount.diameterMm) && Number.isInteger(mount.capacity) && mount.capacity >= 0))) invalid('fanMounts');
  }
  return errors;
}
