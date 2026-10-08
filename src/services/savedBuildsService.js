import { savedBuilds } from '../data/savedBuilds.js';
import {
  hasRequiredSavedBuildComponents,
  normalizeSavedBuildComponents,
  normalizeText,
  savedBuildRequiredComponentSlots
} from '../models/savedBuildModel.js';
import { selectBuildComponents, calculateBuildPrice } from './build.service.js';

let nextSavedBuildNumber = 1;

export function listSavedBuilds() {
  return savedBuilds;
}

export function getSavedBuildById(savedBuildId) {
  const savedBuild = findSavedBuildById(savedBuildId);

  if (!savedBuild) {
    const error = new Error('Configuração salva não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  return savedBuild;
}

export function saveBuild(buildInput) {
  validateBuildPayload(buildInput);

  const name = normalizeText(buildInput.name);
  if (!name) {
    const error = new Error('O nome da configuração é obrigatório.');
    error.statusCode = 400;
    throw error;
  }

  const components = normalizeSavedBuildComponents(buildInput.components);
  validateRequiredComponents(components);
  validateExistingComponents(components);

  const now = new Date().toISOString();
  const savedBuild = {
    id: generateSavedBuildId(),
    name,
    ...(normalizeText(buildInput.description) && { description: normalizeText(buildInput.description) }),
    ...(normalizeText(buildInput.observations ?? buildInput.notes) && {
      observations: normalizeText(buildInput.observations ?? buildInput.notes)
    }),
    components,
    ...(buildInput.budget !== undefined && { budget: buildInput.budget }),
    ...(normalizeText(buildInput.usageType) && { usageType: normalizeText(buildInput.usageType) }),
    totalEstimatedPrice: calculateTotalEstimatedPrice(components),
    ...(buildInput.compatibilityStatus !== undefined && {
      compatibilityStatus: buildInput.compatibilityStatus
    }),
    ...(buildInput.summary !== undefined && { summary: buildInput.summary }),
    userId: buildInput.userId ?? null,
    createdAt: now,
    updatedAt: now
  };

  savedBuilds.push(savedBuild);

  return savedBuild;
}

export function updateSavedBuild(savedBuildId, buildInput) {
  validateBuildPayload(buildInput);

  const savedBuild = findSavedBuildById(savedBuildId);

  if (!savedBuild) {
    const error = new Error('Configuração salva não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  const updatedFields = {};

  if (Object.prototype.hasOwnProperty.call(buildInput, 'name')) {
    const name = normalizeText(buildInput.name);

    if (!name) {
      const error = new Error('O nome da configuração é obrigatório.');
      error.statusCode = 400;
      throw error;
    }

    updatedFields.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(buildInput, 'description')) {
    const description = normalizeText(buildInput.description);

    if (description) {
      updatedFields.description = description;
    } else {
      updatedFields.description = undefined;
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(buildInput, 'observations') ||
    Object.prototype.hasOwnProperty.call(buildInput, 'notes')
  ) {
    const observations = normalizeText(buildInput.observations ?? buildInput.notes);

    if (observations) {
      updatedFields.observations = observations;
    } else {
      updatedFields.observations = undefined;
    }
  }

  if (Object.prototype.hasOwnProperty.call(buildInput, 'components')) {
    const components = {
      ...savedBuild.components,
      ...normalizeSavedBuildComponents(buildInput.components)
    };

    validateRequiredComponents(components);
    validateExistingComponents(components);

    updatedFields.components = components;
    updatedFields.totalEstimatedPrice = calculateTotalEstimatedPrice(components);

    if (!Object.prototype.hasOwnProperty.call(buildInput, 'summary')) {
      updatedFields.summary = savedBuild.summary ?? 'Configuração atualizada. A build pode ser reavaliada para gerar novo resumo.';
    }
  }

  if (Object.prototype.hasOwnProperty.call(buildInput, 'budget')) {
    updatedFields.budget = buildInput.budget;
  }

  if (Object.prototype.hasOwnProperty.call(buildInput, 'usageType')) {
    const usageType = normalizeText(buildInput.usageType);

    if (usageType) {
      updatedFields.usageType = usageType;
    } else {
      updatedFields.usageType = undefined;
    }
  }

  // Prices are always derived from the current catalog, never trusted from a client.
  updatedFields.totalEstimatedPrice = calculateTotalEstimatedPrice(updatedFields.components ?? savedBuild.components);

  if (Object.prototype.hasOwnProperty.call(buildInput, 'compatibilityStatus')) {
    updatedFields.compatibilityStatus = buildInput.compatibilityStatus;
  }

  if (Object.prototype.hasOwnProperty.call(buildInput, 'summary')) {
    updatedFields.summary = buildInput.summary;
  }

  if (Object.prototype.hasOwnProperty.call(buildInput, 'userId')) {
    updatedFields.userId = buildInput.userId;
  }

  Object.entries(updatedFields).forEach(([field, value]) => {
    if (value === undefined) {
      delete savedBuild[field];
      return;
    }

    savedBuild[field] = value;
  });

  savedBuild.updatedAt = new Date().toISOString();

  return savedBuild;
}

export function deleteSavedBuild(savedBuildId) {
  const savedBuildIndex = savedBuilds.findIndex((savedBuild) => savedBuild.id === savedBuildId);

  if (savedBuildIndex === -1) {
    const error = new Error('Configuração salva não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  const [removedSavedBuild] = savedBuilds.splice(savedBuildIndex, 1);

  return removedSavedBuild;
}

export function clearSavedBuildsForTests() {
  savedBuilds.splice(0, savedBuilds.length);
  nextSavedBuildNumber = 1;
}

function validateBuildPayload(buildInput) {
  if (!buildInput || typeof buildInput !== 'object' || Array.isArray(buildInput)) {
    const error = new Error('Informe os dados da configuração montada.');
    error.statusCode = 400;
    throw error;
  }
}

function validateRequiredComponents(components) {
  if (hasRequiredSavedBuildComponents(components)) {
    return;
  }

  const missingComponents = savedBuildRequiredComponentSlots.filter((slot) => !components[slot]);
  const error = new Error('A configuração deve conter todos os componentes principais.');
  error.statusCode = 400;
  error.errors = missingComponents.map((slot) => `Componente obrigatório ausente: ${slot}.`);
  throw error;
}

function validateExistingComponents(components) {
  try {
    selectBuildComponents({ components });
  } catch (error) {
    if (error.statusCode === 404) error.message = 'Um ou mais componentes informados não existem.';
    throw error;
  }
}

function calculateTotalEstimatedPrice(components) {
  return calculateBuildPrice(selectBuildComponents({ components }));
}

function generateSavedBuildId() {
  const id = `build-${String(nextSavedBuildNumber).padStart(3, '0')}`;
  nextSavedBuildNumber += 1;

  return id;
}

function findSavedBuildById(savedBuildId) {
  return savedBuilds.find((savedBuild) => savedBuild.id === savedBuildId) || null;
}
