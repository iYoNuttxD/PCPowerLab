import {
  buildBottleneckExplanation,
  buildBudgetExplanation,
  buildGeneralExplanation,
  buildIncompatibilityExplanation,
  buildPerformanceExplanation,
  buildRecommendationExplanation
} from '../utils/explanationTemplates.js';

const supportedExplanationTypes = [
  'incompatibility',
  'compatibility',
  'bottleneck',
  'recommendation',
  'performance',
  'budget',
  'warning',
  'general'
];

const supportedSeverities = ['low', 'medium', 'high'];

export function generateExplanation(input) {
  validateExplanationPayload(input);

  const type = normalizeText(input.type);
  validateExplanationType(type);

  const data = normalizeData(input.data);
  const explanation = buildExplanationByType(type, data);
  const severity = normalizeSeverity(data.severity) || inferSeverity(type, data);

  return {
    title: explanation.title,
    simpleExplanation: explanation.simpleExplanation,
    suggestion: explanation.suggestion,
    severity
  };
}

function buildExplanationByType(type, data) {
  if (type === 'incompatibility' || type === 'compatibility') {
    return buildIncompatibilityExplanation(data);
  }

  if (type === 'bottleneck') {
    return buildBottleneckExplanation(data);
  }

  if (type === 'recommendation') {
    return buildRecommendationExplanation(data);
  }

  if (type === 'performance') {
    return buildPerformanceExplanation(data);
  }

  if (type === 'budget') {
    return buildBudgetExplanation(data);
  }

  return buildGeneralExplanation(data);
}

function validateExplanationPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('Informe os dados para gerar a explicacao.');
    error.statusCode = 400;
    throw error;
  }

  if (!isFilledText(input.type)) {
    const error = new Error('Tipo de explicacao obrigatorio.');
    error.statusCode = 400;
    error.errors = ['type deve ser informado.'];
    throw error;
  }
}

function validateExplanationType(type) {
  if (supportedExplanationTypes.includes(type)) {
    return;
  }

  const error = new Error('Tipo de explicacao invalido.');
  error.statusCode = 400;
  error.errors = [`Tipos aceitos: ${supportedExplanationTypes.join(', ')}.`];
  throw error;
}

function normalizeData(dataInput) {
  if (dataInput === undefined || dataInput === null) {
    return {};
  }

  if (typeof dataInput === 'object' && !Array.isArray(dataInput)) {
    return dataInput;
  }

  const error = new Error('Dados tecnicos invalidos.');
  error.statusCode = 400;
  error.errors = ['data deve ser um objeto quando informado.'];
  throw error;
}

function inferSeverity(type, data) {
  if (type === 'incompatibility' || type === 'compatibility') {
    return 'high';
  }

  if (type === 'budget') {
    return inferBudgetSeverity(data);
  }

  if (type === 'performance') {
    return inferPerformanceSeverity(data);
  }

  if (type === 'warning' || type === 'general') {
    return 'low';
  }

  return 'medium';
}

function inferBudgetSeverity(data) {
  const budgetAmount = Number(data.budgetAmount ?? data.amount);
  const totalPrice = Number(data.totalPrice ?? data.totalEstimatedPrice);
  const remainingBudget = Number(data.remainingBudget);

  if (Number.isFinite(budgetAmount) && Number.isFinite(totalPrice)) {
    return totalPrice > budgetAmount ? 'high' : 'low';
  }

  if (Number.isFinite(remainingBudget)) {
    return remainingBudget < 0 ? 'high' : 'low';
  }

  return 'low';
}

function inferPerformanceSeverity(data) {
  const score = Number(data.performanceScore ?? data.score);

  if (!Number.isFinite(score)) {
    return 'medium';
  }

  if (score >= 80) {
    return 'low';
  }

  if (score >= 60) {
    return 'medium';
  }

  return 'high';
}

function normalizeSeverity(severityInput) {
  const severity = normalizeText(severityInput);

  if (!severity) {
    return null;
  }

  if (supportedSeverities.includes(severity)) {
    return severity;
  }

  const error = new Error('Severidade invalida.');
  error.statusCode = 400;
  error.errors = [`Severidades aceitas: ${supportedSeverities.join(', ')}.`];
  throw error;
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  return value.trim().toLowerCase();
}

function isFilledText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}