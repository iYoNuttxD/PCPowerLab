import { selectBuildComponents } from './build.service.js';
import { summarizeBuildPricing } from './marketPriceService.js';
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

const isolatedValidationErrors = new Set([
  'READY_BUILD_UNVERIFIED',
  'READY_BUILD_INCOMPATIBLE',
  'READY_BUILD_INVALID_COMPONENTS',
  'READY_BUILD_INVALID_PROFILE'
]);

export function listReadyBuilds(filters = {}) {
  const profile = normalizeOptionalText(filters.profile ?? filters.usageProfile);

  if (profile) {
    validateUsageProfile(profile);
  }

  return readyBuilds
    .filter((readyBuild) => !profile || readyBuild.usageProfile === profile)
    .flatMap((readyBuild) => {
      try {
        return [formatReadyBuild(readyBuild)];
      } catch (error) {
        if (!isolatedValidationErrors.has(error.code)) throw error;

        // The existing array consumer offers every returned preset for use. Keep
        // unverified/invalid presets out, with enough diagnostics to repair them.
        console.warn('[ready-builds] Configuracao pronta excluida da listagem.', {
          code: 'READY_BUILD_EXCLUDED',
          readyBuildId: readyBuild.id,
          reason: error.code,
          status: error.compatibility?.status ?? 'invalid',
          componentIds: readyBuild.components,
          errors: error.errors,
          alerts: error.compatibility?.alerts ?? [],
          unverifiedChecks: error.compatibility?.unverifiedChecks ?? []
        });
        return [];
      }
    });
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
  const compatibility = validateReadyBuild(readyBuild);

  const pricing = summarizeBuildPricing(selectBuildComponents(readyBuild.components));
  return {
    ...readyBuild,
    compatibility,
    estimatedTotalPrice: pricing.estimatedTotal,
    budgetStatus: pricing.estimatedTotal === null ? 'unknown'
      : pricing.estimatedTotal > readyBuild.targetBudgetRange.max ? 'above_range'
        : pricing.estimatedTotal < readyBuild.targetBudgetRange.min ? 'below_range' : 'within_range',
    amountAboveTargetRange: pricing.estimatedTotal === null ? null
      : Math.max(0, Number((pricing.estimatedTotal - readyBuild.targetBudgetRange.max).toFixed(2))),
    pricing
  };
}

function validateReadyBuild(readyBuild) {
  validateUsageProfile(readyBuild.usageProfile);
  validateExistingComponents(readyBuild);
  return validateCompatibility(readyBuild);
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
  error.code = 'READY_BUILD_INVALID_COMPONENTS';
  error.errors = errors;
  throw error;
}

function validateCompatibility(readyBuild) {
  const { compatible, status, alerts, unverifiedChecks } = checkBuildCompatibility(readyBuild.components);
  const compatibility = { compatible, status, alerts, unverifiedChecks };

  if (compatible) {
    return compatibility;
  }

  const error = new Error('Configuracao pronta possui incompatibilidades.');
  error.statusCode = 500;
  error.code = status === 'unverified' ? 'READY_BUILD_UNVERIFIED' : 'READY_BUILD_INCOMPATIBLE';
  error.compatibility = compatibility;
  error.errors = [...alerts, ...unverifiedChecks].map((issue) => issue.message);
  throw error;
}

function validateUsageProfile(profile) {
  if (supportedReadyBuildProfiles.includes(profile)) {
    return;
  }

  const error = new Error('Perfil de uso invalido.');
  error.statusCode = 400;
  error.code = 'READY_BUILD_INVALID_PROFILE';
  error.errors = [`Perfis aceitos: ${supportedReadyBuildProfiles.join(', ')}.`];
  throw error;
}

function normalizeOptionalText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim().toLowerCase();
}
