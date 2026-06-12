import { savedBuildVersions } from '../data/savedBuildVersions.js';
import { getSavedBuildById } from './savedBuildsService.js';

const defaultVersionReason = 'Versao registrada sem motivo informado.';

let nextSavedBuildVersionNumber = 1;

export function listSavedBuildVersions(savedBuildId) {
  validateSavedBuildExists(savedBuildId);

  return savedBuildVersions.filter((version) => version.buildId === savedBuildId);
}

export function getSavedBuildVersionById(savedBuildId, versionId) {
  validateSavedBuildExists(savedBuildId);

  const version = findSavedBuildVersion(savedBuildId, versionId);

  if (!version) {
    const error = new Error('Versao da configuracao salva nao encontrada.');
    error.statusCode = 404;
    throw error;
  }

  return version;
}

export function createSavedBuildVersion(savedBuildId, versionInput) {
  validateSavedBuildExists(savedBuildId);
  validateVersionPayload(versionInput);

  const buildSnapshot = cloneSnapshot(versionInput.buildSnapshot);
  const reason = normalizeOptionalText(versionInput.reason) || defaultVersionReason;

  const version = {
    id: generateSavedBuildVersionId(),
    buildId: savedBuildId,
    versionNumber: getNextVersionNumberForBuild(savedBuildId),
    reason,
    buildSnapshot,
    createdAt: new Date().toISOString()
  };

  savedBuildVersions.push(version);

  return version;
}

export function deleteSavedBuildVersion(savedBuildId, versionId) {
  validateSavedBuildExists(savedBuildId);

  const versionIndex = savedBuildVersions.findIndex(
    (version) => version.buildId === savedBuildId && version.id === versionId
  );

  if (versionIndex === -1) {
    const error = new Error('Versao da configuracao salva nao encontrada.');
    error.statusCode = 404;
    throw error;
  }

  const [removedVersion] = savedBuildVersions.splice(versionIndex, 1);

  return removedVersion;
}

export function clearSavedBuildVersionsForTests() {
  savedBuildVersions.splice(0, savedBuildVersions.length);
  nextSavedBuildVersionNumber = 1;
}

function validateSavedBuildExists(savedBuildId) {
  getSavedBuildById(savedBuildId);
}

function validateVersionPayload(versionInput) {
  if (!versionInput || typeof versionInput !== 'object' || Array.isArray(versionInput)) {
    const error = new Error('Informe os dados da versao da configuracao.');
    error.statusCode = 400;
    throw error;
  }

  if (!isStructuredObject(versionInput.buildSnapshot)) {
    const error = new Error('Snapshot da configuracao e obrigatorio.');
    error.statusCode = 400;
    error.errors = ['buildSnapshot deve ser informado como objeto.'];
    throw error;
  }
}

function getNextVersionNumberForBuild(savedBuildId) {
  const highestVersionNumber = savedBuildVersions
    .filter((version) => version.buildId === savedBuildId)
    .reduce((highest, version) => Math.max(highest, version.versionNumber), 0);

  return highestVersionNumber + 1;
}

function generateSavedBuildVersionId() {
  const id = `version-${String(nextSavedBuildVersionNumber).padStart(3, '0')}`;
  nextSavedBuildVersionNumber += 1;

  return id;
}

function findSavedBuildVersion(savedBuildId, versionId) {
  return savedBuildVersions.find((version) => version.buildId === savedBuildId && version.id === versionId) || null;
}

function cloneSnapshot(buildSnapshot) {
  return JSON.parse(JSON.stringify(buildSnapshot));
}

function normalizeOptionalText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function isStructuredObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}