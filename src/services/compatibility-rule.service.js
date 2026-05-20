import { compatibilityRules } from '../data/compatibility-rules.mock.js';
import {
  compatibilityRuleComponentTypes,
  compatibilityRuleOperators,
  compatibilityRuleSeverities,
  isValidCompatibilityRuleComponentType,
  isValidCompatibilityRuleOperator,
  isValidCompatibilityRuleSeverity
} from '../models/compatibility-rule.model.js';

const requiredCompatibilityRuleFields = [
  'name',
  'sourceType',
  'targetType',
  'field',
  'operator',
  'severity',
  'message'
];

export function listCompatibilityRules(filters = {}) {
  const sourceType = normalizeOptionalComponentType(filters.sourceType);
  const targetType = normalizeOptionalComponentType(filters.targetType);
  const active = normalizeOptionalBoolean(filters.active);

  validateOptionalComponentTypeFilter(sourceType, 'sourceType');
  validateOptionalComponentTypeFilter(targetType, 'targetType');

  return compatibilityRules
    .filter((rule) => !sourceType || rule.sourceType === sourceType)
    .filter((rule) => !targetType || rule.targetType === targetType)
    .filter((rule) => active === null || rule.active === active)
    .sort((firstRule, secondRule) => firstRule.priority - secondRule.priority);
}

export function createCompatibilityRule(ruleInput) {
  validateCompatibilityRuleInput(ruleInput);

  const rule = normalizeCompatibilityRule(ruleInput);
  validateDuplicateRuleId(rule.id);

  compatibilityRules.push(rule);

  return rule;
}

export function updateCompatibilityRule(ruleId, ruleInput) {
  const currentRuleIndex = findCompatibilityRuleIndex(ruleId);

  if (currentRuleIndex === -1) {
    throwCompatibilityRuleNotFoundError();
  }

  validateCompatibilityRulePatchPayload(ruleInput);

  validateCompatibilityRuleInput({
    ...compatibilityRules[currentRuleIndex],
    ...ruleInput,
    id: ruleId
  });

  const updatedRule = normalizeCompatibilityRule({
    ...compatibilityRules[currentRuleIndex],
    ...ruleInput,
    id: ruleId
  });

  compatibilityRules[currentRuleIndex] = updatedRule;

  return updatedRule;
}

function validateCompatibilityRulePatchPayload(ruleInput) {
  if (!ruleInput || typeof ruleInput !== 'object' || Array.isArray(ruleInput)) {
    const error = new Error('Informe os dados da regra de compatibilidade.');
    error.statusCode = 400;
    throw error;
  }
}

export function deleteCompatibilityRule(ruleId) {
  const currentRuleIndex = findCompatibilityRuleIndex(ruleId);

  if (currentRuleIndex === -1) {
    throwCompatibilityRuleNotFoundError();
  }

  const [deletedRule] = compatibilityRules.splice(currentRuleIndex, 1);

  return deletedRule;
}

function normalizeCompatibilityRule(ruleInput) {
  return {
    id: trimOptionalText(ruleInput.id) || generateCompatibilityRuleId(),
    name: ruleInput.name.trim(),
    sourceType: ruleInput.sourceType.trim().toLowerCase(),
    targetType: ruleInput.targetType.trim().toLowerCase(),
    field: ruleInput.field.trim(),
    targetField: trimOptionalText(ruleInput.targetField) || ruleInput.field.trim(),
    operator: ruleInput.operator.trim(),
    severity: ruleInput.severity.trim().toLowerCase(),
    active: typeof ruleInput.active === 'boolean' ? ruleInput.active : true,
    priority: Number.isInteger(ruleInput.priority) ? ruleInput.priority : compatibilityRules.length + 1,
    message: ruleInput.message.trim()
  };
}

function validateCompatibilityRuleInput(ruleInput) {
  if (!ruleInput || typeof ruleInput !== 'object' || Array.isArray(ruleInput)) {
    const error = new Error('Informe os dados da regra de compatibilidade.');
    error.statusCode = 400;
    throw error;
  }

  const errors = [
    ...validateRequiredFields(ruleInput),
    ...validateRuleValues(ruleInput)
  ];

  if (errors.length > 0) {
    const error = new Error('Regra de compatibilidade inválida.');
    error.statusCode = 400;
    error.errors = errors;
    throw error;
  }
}

function validateRequiredFields(ruleInput) {
  return requiredCompatibilityRuleFields
    .filter((field) => !isFilledText(ruleInput[field]))
    .map((field) => `Campo obrigatório ausente ou inválido: ${field}.`);
}

function validateRuleValues(ruleInput) {
  const errors = [];
  const sourceType = normalizeOptionalComponentType(ruleInput.sourceType);
  const targetType = normalizeOptionalComponentType(ruleInput.targetType);
  const operator = trimOptionalText(ruleInput.operator);
  const severity = normalizeOptionalComponentType(ruleInput.severity);

  if (sourceType && !isValidCompatibilityRuleComponentType(sourceType)) {
    errors.push(`sourceType inválido. Tipos aceitos: ${compatibilityRuleComponentTypes.join(', ')}.`);
  }

  if (targetType && !isValidCompatibilityRuleComponentType(targetType)) {
    errors.push(`targetType inválido. Tipos aceitos: ${compatibilityRuleComponentTypes.join(', ')}.`);
  }

  if (operator && !isValidCompatibilityRuleOperator(operator)) {
    errors.push(`operator inválido. Operadores aceitos: ${compatibilityRuleOperators.join(', ')}.`);
  }

  if (severity && !isValidCompatibilityRuleSeverity(severity)) {
    errors.push(`severity inválida. Severidades aceitas: ${compatibilityRuleSeverities.join(', ')}.`);
  }

  if (ruleInput.id !== undefined && !isFilledText(ruleInput.id)) {
    errors.push('id deve ser um texto válido quando informado.');
  }

  if (ruleInput.targetField !== undefined && !isFilledText(ruleInput.targetField)) {
    errors.push('targetField deve ser um texto válido quando informado.');
  }

  if (ruleInput.active !== undefined && typeof ruleInput.active !== 'boolean') {
    errors.push('active deve ser booleano quando informado.');
  }

  if (ruleInput.priority !== undefined && !Number.isInteger(ruleInput.priority)) {
    errors.push('priority deve ser um número inteiro quando informado.');
  }

  return errors;
}

function validateOptionalComponentTypeFilter(componentType, filterName) {
  if (!componentType || isValidCompatibilityRuleComponentType(componentType)) {
    return;
  }

  const error = new Error(`Filtro ${filterName} inválido.`);
  error.statusCode = 400;
  error.errors = [`Tipos aceitos: ${compatibilityRuleComponentTypes.join(', ')}.`];
  throw error;
}

function validateDuplicateRuleId(ruleId) {
  const alreadyExists = compatibilityRules.some((rule) => rule.id === ruleId);

  if (!alreadyExists) {
    return;
  }

  const error = new Error('Já existe uma regra de compatibilidade com o ID informado.');
  error.statusCode = 409;
  throw error;
}

function findCompatibilityRuleIndex(ruleId) {
  return compatibilityRules.findIndex((rule) => rule.id === ruleId);
}

function throwCompatibilityRuleNotFoundError() {
  const error = new Error('Regra de compatibilidade nao encontrada.');
  error.statusCode = 404;
  throw error;
}

function generateCompatibilityRuleId() {
  const nextNumber = compatibilityRules.length + 1;

  return `rule-${String(nextNumber).padStart(3, '0')}`;
}

function normalizeOptionalComponentType(value) {
  if (!isFilledText(value)) {
    return null;
  }

  return value.trim().toLowerCase();
}

function trimOptionalText(value) {
  if (!isFilledText(value)) {
    return null;
  }

  return value.trim();
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

  const error = new Error('Filtro active inválido.');
  error.statusCode = 400;
  error.errors = ['Valores aceitos para active: true ou false.'];
  throw error;
}

function isFilledText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
