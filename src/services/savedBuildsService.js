import { savedBuilds } from '../data/savedBuilds.js';
import {
  hasRequiredSavedBuildComponents,
  normalizeSavedBuildComponents,
  normalizeText,
  savedBuildRequiredComponentSlots
} from '../models/savedBuildModel.js';
import { findComponentById } from './component.service.js';

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
    components,
    ...(buildInput.budget !== undefined && { budget: buildInput.budget }),
    ...(normalizeText(buildInput.usageType) && { usageType: normalizeText(buildInput.usageType) }),
    totalEstimatedPrice: buildInput.totalEstimatedPrice ?? calculateTotalEstimatedPrice(components),
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
  const invalidComponents = savedBuildRequiredComponentSlots
    .map((slot) => ({
      slot,
      componentId: components[slot],
      component: findComponentById(components[slot])
    }))
    .filter((selection) => !selection.component);

  if (invalidComponents.length === 0) {
    return;
  }

  const error = new Error('Um ou mais componentes informados não existem.');
  error.statusCode = 404;
  error.errors = invalidComponents.map(
    (selection) => `Componente não encontrado para ${selection.slot}: ${selection.componentId}.`
  );
  throw error;
}

function calculateTotalEstimatedPrice(components) {
  return savedBuildRequiredComponentSlots.reduce((total, slot) => {
    const component = findComponentById(components[slot]);

    return total + (Number(component?.price) || 0);
  }, 0);
}

function generateSavedBuildId() {
  const id = `build-${String(nextSavedBuildNumber).padStart(3, '0')}`;
  nextSavedBuildNumber += 1;

  return id;
}

function findSavedBuildById(savedBuildId) {
  return savedBuilds.find((savedBuild) => savedBuild.id === savedBuildId) || null;
}
