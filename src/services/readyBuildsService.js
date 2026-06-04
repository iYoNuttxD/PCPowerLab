import { readyBuilds } from '../data/readyBuilds.js';
import { findComponentById } from './component.service.js';
import { checkBuildCompatibility } from './compatibility.service.js';

export const supportedReadyBuildProfiles = [
  'gaming',
  'study',
  'programming',
  'video-editing',
  'work',
  'streaming',
  'general',
  'cost-benefit',
  'high-performance'
];

const componentFieldsBySlot = {
  cpu: 'cpuId',
  motherboard: 'motherboardId',
  gpu: 'gpuId',
  ram: 'ramId',
  storage: 'storageId',
  psu: 'psuId',
  case: 'caseId'
};

export function listReadyBuilds(filters = {}) {
  const profile = normalizeOptionalText(filters.profile ?? filters.usageProfile);

  if (profile) {
    validateUsageProfile(profile);
  }

  return readyBuilds
    .filter((readyBuild) => !profile || readyBuild.usageProfile === profile)
    .map(formatReadyBuild);
}

export function getReadyBuildById(readyBuildId) {
  const readyBuild = readyBuilds.find((build) => build.id === readyBuildId);

  if (!readyBuild) {
    const error = new Error('Configuracao pronta nao encontrada.');
    error.statusCode = 404;
    throw error;
  }

  return formatReadyBuild(readyBuild);
}

function formatReadyBuild(readyBuild) {
  validateReadyBuild(readyBuild);

  return {
    ...readyBuild,
    estimatedTotalPrice: calculateEstimatedTotalPrice(readyBuild.components)
  };
}

function validateReadyBuild(readyBuild) {
  validateUsageProfile(readyBuild.usageProfile);
  validateExistingComponents(readyBuild);
  validateCompatibility(readyBuild);
}

function validateExistingComponents(readyBuild) {
  const errors = Object.entries(componentFieldsBySlot)
    .map(([slot, field]) => ({
      slot,
      componentId: readyBuild.components[field],
      component: findComponentById(readyBuild.components[field])
    }))
    .filter(({ component, slot }) => !component || component.category !== slot)
    .map(({ slot, componentId }) => `Componente invalido para ${slot}: ${componentId}.`);

  if (errors.length === 0) {
    return;
  }

  const error = new Error('Configuracao pronta possui componentes invalidos.');
  error.statusCode = 500;
  error.errors = errors;
  throw error;
}

function validateCompatibility(readyBuild) {
  const compatibilityResult = checkBuildCompatibility(readyBuild.components);

  if (compatibilityResult.compatible) {
    return;
  }

  const error = new Error('Configuracao pronta possui incompatibilidades.');
  error.statusCode = 500;
  error.errors = compatibilityResult.alerts.map((alert) => alert.message);
  throw error;
}

function calculateEstimatedTotalPrice(components) {
  const total = Object.values(componentFieldsBySlot).reduce((sum, field) => {
    const component = findComponentById(components[field]);

    return sum + (component?.price ?? 0);
  }, 0);

  return Number(total.toFixed(2));
}

function validateUsageProfile(profile) {
  if (supportedReadyBuildProfiles.includes(profile)) {
    return;
  }

  const error = new Error('Perfil de uso invalido.');
  error.statusCode = 400;
  error.errors = [`Perfis aceitos: ${supportedReadyBuildProfiles.join(', ')}.`];
  throw error;
}

function normalizeOptionalText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim().toLowerCase();
}