import { analysisHistory } from '../data/analysisHistory.js';

const validAnalysisTypes = [
  'compatibility',
  'alerts',
  'bottlenecks',
  'game-performance',
  'budget',
  'recommendation',
  'build-summary',
  'build-score',
  'upgrade-suggestion'
];

let nextAnalysisHistoryNumber = 1;

export function listAnalysisHistory(filters = {}) {
  const buildId = normalizeOptionalText(filters.buildId);

  if (!buildId) {
    return analysisHistory;
  }

  return analysisHistory.filter((record) => record.buildId === buildId);
}

export function getAnalysisHistoryById(analysisHistoryId) {
  const record = findAnalysisHistoryById(analysisHistoryId);

  if (!record) {
    const error = new Error('Historico de analise nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return record;
}

export function createAnalysisHistoryRecord(analysisInput) {
  validateAnalysisPayload(analysisInput);

  const analysisType = normalizeRequiredText(analysisInput.analysisType, 'analysisType');
  validateAnalysisType(analysisType);

  const record = {
    id: generateAnalysisHistoryId(),
    ...(normalizeOptionalText(analysisInput.buildId) && { buildId: normalizeOptionalText(analysisInput.buildId) }),
    analysisType,
    createdAt: new Date().toISOString(),
    input: analysisInput.input,
    result: analysisInput.result
  };

  analysisHistory.push(record);

  return record;
}

export function deleteAnalysisHistoryRecord(analysisHistoryId) {
  const recordIndex = analysisHistory.findIndex((record) => record.id === analysisHistoryId);

  if (recordIndex === -1) {
    const error = new Error('Historico de analise nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const [removedRecord] = analysisHistory.splice(recordIndex, 1);

  return removedRecord;
}

export function clearAnalysisHistoryForTests() {
  analysisHistory.splice(0, analysisHistory.length);
  nextAnalysisHistoryNumber = 1;
}

function validateAnalysisPayload(analysisInput) {
  if (!analysisInput || typeof analysisInput !== 'object' || Array.isArray(analysisInput)) {
    const error = new Error('Informe os dados do historico de analise.');
    error.statusCode = 400;
    throw error;
  }

  const errors = [];

  if (!isFilledText(analysisInput.analysisType)) {
    errors.push('analysisType deve ser informado.');
  }

  if (!isStructuredData(analysisInput.input)) {
    errors.push('input deve ser informado como objeto ou array.');
  }

  if (!isStructuredData(analysisInput.result)) {
    errors.push('result deve ser informado como objeto ou array.');
  }

  if (errors.length === 0) {
    return;
  }

  const error = new Error('Dados obrigatorios ausentes para registrar historico de analise.');
  error.statusCode = 400;
  error.errors = errors;
  throw error;
}

function validateAnalysisType(analysisType) {
  if (validAnalysisTypes.includes(analysisType)) {
    return;
  }

  const error = new Error('Tipo de analise invalido.');
  error.statusCode = 400;
  error.errors = [`Tipos aceitos: ${validAnalysisTypes.join(', ')}.`];
  throw error;
}

function generateAnalysisHistoryId() {
  const id = `analysis-${String(nextAnalysisHistoryNumber).padStart(3, '0')}`;
  nextAnalysisHistoryNumber += 1;

  return id;
}

function findAnalysisHistoryById(analysisHistoryId) {
  return analysisHistory.find((record) => record.id === analysisHistoryId) || null;
}

function normalizeRequiredText(value, fieldName) {
  if (!isFilledText(value)) {
    const error = new Error('Dados obrigatorios ausentes para registrar historico de analise.');
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

function isStructuredData(value) {
  return value !== null && typeof value === 'object';
}