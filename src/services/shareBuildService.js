import { sharedBuilds } from '../data/sharedBuilds.js';
import { selectBuildComponents, serializeBuildSelection } from './build.service.js';
import { generateBuildSummary } from './buildSummaryService.js';
import { getSavedBuildById } from './savedBuildsService.js';

let nextShareBuildNumber = 1;

export function createBuildShare(shareInput) {
  validateSharePayload(shareInput);

  const source = resolveShareSource(shareInput);
  const buildSummary = generateBuildSummary({
    build: source.build,
    budget: source.budget,
    gameId: source.gameId,
    usageType: source.usageType,
    targetResolution: source.targetResolution,
    qualityPreset: source.qualityPreset
  });
  const now = new Date().toISOString();
  const sharedBuild = {
    shareId: generateShareId(),
    shareUrl: null,
    createdAt: now,
    status: 'active',
    source: source.source,
    ...(source.buildId && { buildId: source.buildId }),
    buildSummary: buildShareSummary({
      name: source.name,
      build: source.build,
      buildSummary
    })
  };

  sharedBuild.shareUrl = `/shared-builds/${sharedBuild.shareId}`;
  sharedBuilds.push(sharedBuild);

  return sharedBuild;
}

export function getSharedBuildById(shareId) {
  const normalizedShareId = normalizeText(shareId);
  const sharedBuild = sharedBuilds.find((share) => share.shareId === normalizedShareId);

  if (!sharedBuild) {
    const error = new Error('Compartilhamento de build nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return sharedBuild;
}

export function listSharedBuilds() {
  return sharedBuilds;
}

export function clearSharedBuildsForTests() {
  sharedBuilds.splice(0, sharedBuilds.length);
  nextShareBuildNumber = 1;
}

function validateSharePayload(shareInput) {
  if (!shareInput || typeof shareInput !== 'object' || Array.isArray(shareInput)) {
    const error = new Error('Informe os dados para compartilhar a configuracao.');
    error.statusCode = 400;
    throw error;
  }

  if (!normalizeText(shareInput.buildId) && !isPlainObject(shareInput.build)) {
    const error = new Error('Informe uma build salva ou uma build direta para compartilhamento.');
    error.statusCode = 400;
    error.errors = ['Envie buildId ou build.'];
    throw error;
  }
}

function resolveShareSource(shareInput) {
  const buildId = normalizeText(shareInput.buildId);

  if (buildId) {
    const savedBuild = getSavedBuildById(buildId);

    return {
      source: 'saved_build',
      buildId: savedBuild.id,
      name: savedBuild.name,
      build: mapComponentsToBuildInput(savedBuild.components),
      budget: savedBuild.budget,
      usageType: savedBuild.usageType,
      gameId: shareInput.gameId,
      targetResolution: shareInput.targetResolution,
      qualityPreset: shareInput.qualityPreset
    };
  }

  return {
    source: 'direct_build',
    name: normalizeText(shareInput.name) || 'Configuracao compartilhada',
    build: shareInput.build,
    budget: shareInput.budget,
    usageType: shareInput.usageType,
    gameId: shareInput.gameId,
    targetResolution: shareInput.targetResolution,
    qualityPreset: shareInput.qualityPreset
  };
}

function mapComponentsToBuildInput(components) {
  return { components };
}

function buildShareSummary({ name, build, buildSummary }) {
  return {
    name,
    totalEstimatedPrice: buildSummary.totalEstimatedPrice,
    summary: buildSummary.summary,
    finalRecommendation: buildSummary.finalRecommendation,
    compatibility: buildSummary.compatibility,
    budgetStatus: buildSummary.budgetStatus,
    components: buildSummary.components,
    componentIds: normalizeShareComponentIds(build)
  };
}

function normalizeShareComponentIds(build) {
  return serializeBuildSelection(selectBuildComponents(build));
}

function generateShareId() {
  const id = `share-${String(nextShareBuildNumber).padStart(3, '0')}`;
  nextShareBuildNumber += 1;

  return id;
}

function normalizeText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}