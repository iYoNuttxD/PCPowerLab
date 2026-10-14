import {
  addPerformanceParameterRecord,
  deletePerformanceParameterRecord,
  findPerformanceParameterRecordByComponentId,
  listPerformanceParameterRecords,
  updatePerformanceParameterRecord
} from '../data/performance-parameter.repository.js';
import { findComponentById } from './component.service.js';
import {
  isValidPerformanceParameterType,
  numericPerformanceFields,
  performanceParameterTypes,
  requiredPerformanceFieldsByType
} from '../models/performanceParameterModel.js';

export function listPerformanceParameters(filters = {}) {
  const type = normalizeText(filters.type);

  validateOptionalTypeFilter(type);

  return listPerformanceParameterRecords()
    .filter((parameter) => !type || parameter.type === type);
}

export function findPerformanceParametersByComponentId(componentId) {
  return findPerformanceParameterRecordByComponentId(componentId);
}

export function createPerformanceParameters(parameterInput) {
  validateParameterPayload(parameterInput);

  const parameter = normalizeParameterInput(parameterInput);
  validatePerformanceParameterForSave(parameter);
  validateComponentExistsAndType(parameter.componentId, parameter.type);
  validateDuplicateParameter(parameter.componentId);

  return addPerformanceParameterRecord(parameter);
}

export function updatePerformanceParameters(componentId, parameterInput) {
  validateParameterPayload(parameterInput);

  const currentParameter = findPerformanceParameterRecordByComponentId(componentId);

  if (!currentParameter) {
    throwNotFoundError();
  }

  const parameter = normalizeParameterInput({
    ...currentParameter,
    ...parameterInput,
    componentId
  });

  validatePerformanceParameterForSave(parameter);
  validateComponentExistsAndType(parameter.componentId, parameter.type);

  return updatePerformanceParameterRecord(componentId, parameter);
}

export function deletePerformanceParameters(componentId) {
  const deletedParameter = deletePerformanceParameterRecord(componentId);

  if (!deletedParameter) {
    throwNotFoundError();
  }

  return deletedParameter;
}

function normalizeParameterInput(parameterInput) {
  const parameter = {
    ...parameterInput,
    componentId: normalizeText(parameterInput.componentId),
    type: normalizeText(parameterInput.type)
  };

  numericPerformanceFields.forEach((field) => {
    if (parameter[field] !== undefined && parameter[field] !== null && parameter[field] !== '') {
      parameter[field] = Number(parameter[field]);
    }
  });

  return removeUndefinedValues(parameter);
}

function validatePerformanceParameterForSave(parameter) {
  const errors = [];

  if (!isFilledText(parameter.componentId)) {
    errors.push('Campo obrigatorio ausente ou invalido: componentId.');
  }

  if (!isFilledText(parameter.type)) {
    errors.push('Campo obrigatorio ausente ou invalido: type.');
  } else if (!isValidPerformanceParameterType(parameter.type)) {
    errors.push(`type invalido. Tipos aceitos: ${performanceParameterTypes.join(', ')}.`);
  }

  errors.push(...validateRequiredFields(parameter));
  errors.push(...validateNumericFields(parameter));
  errors.push(...validatePerformanceScoreRange(parameter));

  if (errors.length > 0) {
    const error = new Error('Parametros de desempenho invalidos.');
    error.statusCode = 400;
    error.errors = errors;
    throw error;
  }
}

function validateRequiredFields(parameter) {
  if (!parameter.type || !requiredPerformanceFieldsByType[parameter.type]) {
    return [];
  }

  return requiredPerformanceFieldsByType[parameter.type]
    .filter((field) => parameter[field] === undefined || parameter[field] === null || parameter[field] === '')
    .map((field) => `Campo obrigatorio ausente ou invalido para ${parameter.type}: ${field}.`);
}

function validateNumericFields(parameter) {
  return numericPerformanceFields
    .filter((field) => parameter[field] !== undefined && parameter[field] !== null && !Number.isFinite(parameter[field]))
    .map((field) => `${field} deve ser numerico quando informado.`);
}

function validatePerformanceScoreRange(parameter) {
  return ['performanceScore', 'gamingScore', 'productivityScore', 'airflowScore']
    .filter((field) => parameter[field] !== undefined && parameter[field] !== null
      && Number.isFinite(parameter[field]) && (parameter[field] < 0 || parameter[field] > 100))
    .map((field) => `${field} deve estar na escala de 0 a 100.`);
}

function validateComponentExistsAndType(componentId, type) {
  const component = findComponentById(componentId);

  if (!component) {
    const error = new Error('Componente informado nao existe.');
    error.statusCode = 404;
    throw error;
  }

  if (component.category !== type) {
    const error = new Error('Tipo informado nao corresponde ao tipo do componente.');
    error.statusCode = 400;
    error.errors = [`O componente ${componentId} esta cadastrado como ${component.category}.`];
    throw error;
  }
}

function validateDuplicateParameter(componentId) {
  const alreadyExists = findPerformanceParameterRecordByComponentId(componentId);

  if (!alreadyExists) {
    return;
  }

  const error = new Error('Ja existem parametros de desempenho para este componente. Use a rota de atualizacao.');
  error.statusCode = 409;
  throw error;
}

function validateOptionalTypeFilter(type) {
  if (!type || isValidPerformanceParameterType(type)) {
    return;
  }

  const error = new Error('Tipo de parametro de desempenho invalido.');
  error.statusCode = 400;
  error.errors = [`Tipos aceitos: ${performanceParameterTypes.join(', ')}.`];
  throw error;
}

function validateParameterPayload(parameterInput) {
  if (!parameterInput || typeof parameterInput !== 'object' || Array.isArray(parameterInput)) {
    const error = new Error('Informe os parametros de desempenho.');
    error.statusCode = 400;
    throw error;
  }
}

function throwNotFoundError() {
  const error = new Error('Parametros de desempenho nao encontrados para o componente informado.');
  error.statusCode = 404;
  throw error;
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toLowerCase();
}

function isFilledText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function removeUndefinedValues(parameter) {
  return Object.fromEntries(
    Object.entries(parameter).filter(([, value]) => value !== undefined)
  );
}
