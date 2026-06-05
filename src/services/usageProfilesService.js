import { usageProfiles } from '../data/usageProfiles.js';

const acceptedWeightKeys = ['cpu', 'gpu', 'ram', 'storage', 'costBenefit', 'budget'];
const requiredWeightKeys = ['cpu', 'gpu', 'ram', 'storage', 'costBenefit'];
const acceptedRecommendedMinimumKeys = ['ramGb', 'storageType', 'gpuVramGb'];

export function listUsageProfiles() {
  return usageProfiles;
}

export function getUsageProfileById(usageProfileId) {
  const usageProfile = findUsageProfileById(usageProfileId);

  if (!usageProfile) {
    throwUsageProfileNotFoundError();
  }

  return usageProfile;
}

export function createUsageProfile(profileInput) {
  validateUsageProfilePayload(profileInput);

  const now = new Date().toISOString();
  const usageProfile = {
    id: generateUsageProfileId(profileInput.name),
    name: normalizeRequiredText(profileInput.name, 'name'),
    description: normalizeOptionalText(profileInput.description) || '',
    weights: normalizeWeights(profileInput.weights),
    recommendedMinimums: normalizeRecommendedMinimums(profileInput.recommendedMinimums),
    createdAt: now,
    updatedAt: now
  };

  usageProfiles.push(usageProfile);

  return usageProfile;
}

export function updateUsageProfile(usageProfileId, profileInput) {
  validateUsageProfilePatchPayload(profileInput);

  const usageProfile = findUsageProfileById(usageProfileId);

  if (!usageProfile) {
    throwUsageProfileNotFoundError();
  }

  const updatedFields = {};

  if (Object.prototype.hasOwnProperty.call(profileInput, 'name')) {
    updatedFields.name = normalizeRequiredText(profileInput.name, 'name');
  }

  if (Object.prototype.hasOwnProperty.call(profileInput, 'description')) {
    updatedFields.description = normalizeOptionalText(profileInput.description) || '';
  }

  if (Object.prototype.hasOwnProperty.call(profileInput, 'weights')) {
    updatedFields.weights = normalizeWeights(profileInput.weights);
  }

  if (Object.prototype.hasOwnProperty.call(profileInput, 'recommendedMinimums')) {
    updatedFields.recommendedMinimums = normalizeRecommendedMinimums(profileInput.recommendedMinimums);
  }

  Object.assign(usageProfile, updatedFields, {
    updatedAt: new Date().toISOString()
  });

  return usageProfile;
}

export function deleteUsageProfile(usageProfileId) {
  const usageProfileIndex = usageProfiles.findIndex((usageProfile) => usageProfile.id === usageProfileId);

  if (usageProfileIndex === -1) {
    throwUsageProfileNotFoundError();
  }

  const [deletedUsageProfile] = usageProfiles.splice(usageProfileIndex, 1);

  return deletedUsageProfile;
}

export function clearUsageProfilesForTests() {
  usageProfiles.splice(0, usageProfiles.length);
}

function validateUsageProfilePayload(profileInput) {
  if (!profileInput || typeof profileInput !== 'object' || Array.isArray(profileInput)) {
    const error = new Error('Informe os dados do perfil de uso.');
    error.statusCode = 400;
    throw error;
  }

  const errors = [];

  if (!isFilledText(profileInput.name)) {
    errors.push('name é obrigatório.');
  }

  if (!profileInput.weights || typeof profileInput.weights !== 'object' || Array.isArray(profileInput.weights)) {
    errors.push('weights é obrigatório.');
  } else {
    errors.push(...validateWeightFields(profileInput.weights));
  }

  if (profileInput.recommendedMinimums !== undefined) {
    errors.push(...validateRecommendedMinimums(profileInput.recommendedMinimums));
  }

  if (errors.length === 0) {
    return;
  }

  const error = new Error('Perfil de uso inválido.');
  error.statusCode = 400;
  error.errors = errors;
  throw error;
}

function validateUsageProfilePatchPayload(profileInput) {
  if (!profileInput || typeof profileInput !== 'object' || Array.isArray(profileInput)) {
    const error = new Error('Informe os dados do perfil de uso.');
    error.statusCode = 400;
    throw error;
  }

  const mergedProfile = {
    name: 'Perfil temporario',
    weights: {
      cpu: 20,
      gpu: 20,
      ram: 20,
      storage: 20,
      costBenefit: 20
    },
    ...profileInput
  };

  validateUsageProfilePayload(mergedProfile);
}

function validateWeightFields(weights) {
  const errors = [];
  const informedKeys = Object.keys(weights);
  const unknownKeys = informedKeys.filter((key) => !acceptedWeightKeys.includes(key));

  errors.push(...unknownKeys.map((key) => `Peso desconhecido: ${key}.`));

  errors.push(...requiredWeightKeys
    .filter((key) => !Object.prototype.hasOwnProperty.call(weights, key))
    .map((key) => `Peso obrigatório ausente: ${key}.`));

  for (const key of informedKeys.filter((weightKey) => acceptedWeightKeys.includes(weightKey))) {
    if (!isValidWeight(weights[key])) {
      errors.push(`Peso inválido para ${key}. Informe um número maior ou igual a zero.`);
    }
  }

  const totalWeight = acceptedWeightKeys.reduce((total, key) => total + Number(weights[key] ?? 0), 0);

  if (Number.isFinite(totalWeight) && totalWeight <= 0) {
    errors.push('A soma dos pesos deve ser maior que zero.');
  }

  return errors;
}

function normalizeWeights(weights) {
  const totalWeight = acceptedWeightKeys.reduce((total, key) => total + Number(weights[key] ?? 0), 0);

  const normalizedWeights = acceptedWeightKeys.reduce((weightsByKey, key) => ({
    ...weightsByKey,
    [key]: normalizeWeightValue(Number(weights[key] ?? 0), totalWeight)
  }), {});
  const normalizedTotal = acceptedWeightKeys.reduce((total, key) => total + normalizedWeights[key], 0);
  const roundingDifference = Number((100 - normalizedTotal).toFixed(2));

  if (roundingDifference === 0) {
    return normalizedWeights;
  }

  const correctionKey = acceptedWeightKeys.find((key) => normalizedWeights[key] > 0) || acceptedWeightKeys[0];

  return {
    ...normalizedWeights,
    [correctionKey]: Number((normalizedWeights[correctionKey] + roundingDifference).toFixed(2))
  };
}

function normalizeWeightValue(weight, totalWeight) {
  if (totalWeight === 100) {
    return weight;
  }

  const normalizedWeight = (weight / totalWeight) * 100;

  return Number(normalizedWeight.toFixed(2));
}

function validateRecommendedMinimums(recommendedMinimums) {
  if (!recommendedMinimums || typeof recommendedMinimums !== 'object' || Array.isArray(recommendedMinimums)) {
    return ['recommendedMinimums deve ser um objeto quando informado.'];
  }

  const errors = [];
  const unknownKeys = Object.keys(recommendedMinimums).filter((key) => !acceptedRecommendedMinimumKeys.includes(key));

  errors.push(...unknownKeys.map((key) => `Mínimo recomendado desconhecido: ${key}.`));

  if (
    recommendedMinimums.ramGb !== undefined &&
    !isPositiveNumber(recommendedMinimums.ramGb)
  ) {
    errors.push('recommendedMinimums.ramGb deve ser um número maior que zero.');
  }

  if (
    recommendedMinimums.gpuVramGb !== undefined &&
    !isPositiveNumber(recommendedMinimums.gpuVramGb)
  ) {
    errors.push('recommendedMinimums.gpuVramGb deve ser um número maior que zero.');
  }

  if (
    recommendedMinimums.storageType !== undefined &&
    !isFilledText(recommendedMinimums.storageType)
  ) {
    errors.push('recommendedMinimums.storageType deve ser um texto válido.');
  }

  return errors;
}

function normalizeRecommendedMinimums(recommendedMinimums) {
  if (!recommendedMinimums) {
    return {};
  }

  return {
    ...(recommendedMinimums.ramGb !== undefined && { ramGb: Number(recommendedMinimums.ramGb) }),
    ...(recommendedMinimums.storageType !== undefined && {
      storageType: normalizeRequiredText(recommendedMinimums.storageType, 'storageType')
    }),
    ...(recommendedMinimums.gpuVramGb !== undefined && { gpuVramGb: Number(recommendedMinimums.gpuVramGb) })
  };
}

function findUsageProfileById(usageProfileId) {
  return usageProfiles.find((usageProfile) => usageProfile.id === usageProfileId) || null;
}

function generateUsageProfileId(name) {
  const baseId = `usage-profile-${slugify(name)}`;
  let generatedId = baseId;
  let suffix = 2;

  while (usageProfiles.some((usageProfile) => usageProfile.id === generatedId)) {
    generatedId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return generatedId;
}

function slugify(value) {
  return normalizeRequiredText(value, 'name')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function throwUsageProfileNotFoundError() {
  const error = new Error('Perfil de uso não encontrado.');
  error.statusCode = 404;
  throw error;
}

function normalizeRequiredText(value, fieldName) {
  if (!isFilledText(value)) {
    const error = new Error('Dados obrigatórios ausentes para perfil de uso.');
    error.statusCode = 400;
    error.errors = [`${fieldName} deve ser informado.`];
    throw error;
  }

  return value.trim();
}

function normalizeOptionalText(value) {
  if (!isFilledText(value)) {
    return null;
  }

  return value.trim();
}

function isFilledText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidWeight(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
