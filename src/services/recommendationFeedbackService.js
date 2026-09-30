import { recommendationFeedback } from '../data/recommendationFeedback.js';

export const validRecommendationTypes = [
  'budget-recommendation',
  'build-recommendation',
  'upgrade-suggestion',
  'ready-build',
  'compatibility-fix',
  'general'
];

const maxCommentLength = 500;

let nextRecommendationFeedbackNumber = 1;

export function listRecommendationFeedback(filters = {}) {
  const recommendationType = normalizeOptionalText(filters.recommendationType);

  if (!recommendationType) {
    return recommendationFeedback;
  }

  return recommendationFeedback.filter((feedback) => feedback.recommendationType === recommendationType);
}

export function getRecommendationFeedbackById(feedbackId) {
  const feedback = findRecommendationFeedbackById(feedbackId);

  if (!feedback) {
    const error = new Error('Avaliacao da recomendacao nao encontrada.');
    error.statusCode = 404;
    throw error;
  }

  return feedback;
}

export function createRecommendationFeedback(feedbackInput) {
  validateFeedbackPayload(feedbackInput);

  const recommendationType = normalizeRequiredText(feedbackInput.recommendationType, 'recommendationType');
  validateRecommendationType(recommendationType);

  const rating = normalizeRating(feedbackInput.rating);
  const recommendationId = normalizeRecommendationId(feedbackInput.recommendationId);
  const comment = normalizeComment(feedbackInput.comment);
  const wouldFollowRecommendation = normalizeWouldFollowRecommendation(feedbackInput.wouldFollowRecommendation);
  const source = normalizeOptionalLimitedText(feedbackInput.source, 'source', 80);
  const recommendationTitle = normalizeOptionalLimitedText(feedbackInput.recommendationTitle, 'recommendationTitle', 120);
  const recommendationSummary = normalizeOptionalLimitedText(feedbackInput.recommendationSummary, 'recommendationSummary', 500);
  const totalEstimatedPrice = normalizeOptionalPositiveNumber(feedbackInput.totalEstimatedPrice, 'totalEstimatedPrice');
  const compatibilityStatus = normalizeOptionalLimitedText(feedbackInput.compatibilityStatus, 'compatibilityStatus', 80);
  const performanceLevel = normalizeOptionalLimitedText(feedbackInput.performanceLevel, 'performanceLevel', 80);
  const buildSnapshot = normalizeBuildSnapshot(feedbackInput.buildSnapshot);
  const buildDetails = normalizeBuildDetails(feedbackInput.buildDetails);

  const feedback = {
    id: generateRecommendationFeedbackId(),
    recommendationType,
    ...(recommendationId && { recommendationId }),
    rating,
    ...(comment && { comment }),
    ...(wouldFollowRecommendation !== null && { wouldFollowRecommendation }),
    ...(source && { source }),
    ...(recommendationTitle && { recommendationTitle }),
    ...(recommendationSummary && { recommendationSummary }),
    ...(totalEstimatedPrice !== null && { totalEstimatedPrice }),
    ...(compatibilityStatus && { compatibilityStatus }),
    ...(performanceLevel && { performanceLevel }),
    ...(buildSnapshot && { buildSnapshot }),
    ...(buildDetails && { buildDetails }),
    createdAt: new Date().toISOString()
  };

  recommendationFeedback.push(feedback);

  return feedback;
}

export function deleteRecommendationFeedback(feedbackId) {
  const feedbackIndex = recommendationFeedback.findIndex((feedback) => feedback.id === feedbackId);

  if (feedbackIndex === -1) {
    const error = new Error('Avaliacao da recomendacao nao encontrada.');
    error.statusCode = 404;
    throw error;
  }

  const [removedFeedback] = recommendationFeedback.splice(feedbackIndex, 1);

  return removedFeedback;
}

export function clearRecommendationFeedbackForTests() {
  recommendationFeedback.splice(0, recommendationFeedback.length);
  nextRecommendationFeedbackNumber = 1;
}

function validateFeedbackPayload(feedbackInput) {
  if (!feedbackInput || typeof feedbackInput !== 'object' || Array.isArray(feedbackInput)) {
    const error = new Error('Informe os dados da avaliacao da recomendacao.');
    error.statusCode = 400;
    throw error;
  }

  const errors = [];

  if (!isFilledText(feedbackInput.recommendationType)) {
    errors.push('recommendationType deve ser informado.');
  }

  if (!Object.prototype.hasOwnProperty.call(feedbackInput, 'rating')) {
    errors.push('rating deve ser informado.');
  }

  if (errors.length === 0) {
    return;
  }

  const error = new Error('Dados obrigatorios ausentes para registrar avaliacao da recomendacao.');
  error.statusCode = 400;
  error.errors = errors;
  throw error;
}

function validateRecommendationType(recommendationType) {
  if (validRecommendationTypes.includes(recommendationType)) {
    return;
  }

  const error = new Error('Tipo de recomendacao invalido.');
  error.statusCode = 400;
  error.errors = [`Tipos aceitos: ${validRecommendationTypes.join(', ')}.`];
  throw error;
}

function normalizeRating(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 5) {
    const error = new Error('Nota da recomendacao invalida.');
    error.statusCode = 400;
    error.errors = ['rating deve ser um numero entre 1 e 5.'];
    throw error;
  }

  return value;
}

function normalizeRecommendationId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    const error = new Error('Referencia da recomendacao invalida.');
    error.statusCode = 400;
    error.errors = ['recommendationId deve ser string quando informado.'];
    throw error;
  }

  return normalizeOptionalText(value);
}

function normalizeComment(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    const error = new Error('Comentario da avaliacao invalido.');
    error.statusCode = 400;
    error.errors = ['comment deve ser string quando informado.'];
    throw error;
  }

  const comment = value.trim();

  if (!comment) {
    return null;
  }

  if (comment.length > maxCommentLength) {
    const error = new Error('Comentario da avaliacao muito longo.');
    error.statusCode = 400;
    error.errors = [`comment deve ter no maximo ${maxCommentLength} caracteres.`];
    throw error;
  }

  return comment;
}

function normalizeWouldFollowRecommendation(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'boolean') {
    const error = new Error('Intencao de seguir recomendacao invalida.');
    error.statusCode = 400;
    error.errors = ['wouldFollowRecommendation deve ser booleano quando informado.'];
    throw error;
  }

  return value;
}

function normalizeOptionalLimitedText(value, fieldName, maxLength) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    const error = new Error('Campo opcional da avaliacao invalido.');
    error.statusCode = 400;
    error.errors = [`${fieldName} deve ser string quando informado.`];
    throw error;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    const error = new Error('Campo opcional da avaliacao muito longo.');
    error.statusCode = 400;
    error.errors = [`${fieldName} deve ter no maximo ${maxLength} caracteres.`];
    throw error;
  }

  return normalized;
}

function normalizeOptionalPositiveNumber(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    const error = new Error('Valor numerico opcional da avaliacao invalido.');
    error.statusCode = 400;
    error.errors = [`${fieldName} deve ser um numero positivo quando informado.`];
    throw error;
  }

  return number;
}

function normalizeBuildSnapshot(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error('Snapshot da build avaliada invalido.');
    error.statusCode = 400;
    error.errors = ['buildSnapshot deve ser um objeto quando informado.'];
    throw error;
  }

  const allowedKeys = ['cpuId', 'gpuId', 'motherboardId', 'ramId', 'storageId', 'psuId', 'caseId'];
  const snapshot = allowedKeys.reduce((normalizedSnapshot, key) => {
    const componentId = normalizeOptionalText(value[key]);

    return componentId
      ? { ...normalizedSnapshot, [key]: componentId }
      : normalizedSnapshot;
  }, {});

  return Object.keys(snapshot).length > 0 ? { ...snapshot } : null;
}

function normalizeBuildDetails(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error('Detalhes da build avaliada invalidos.');
    error.statusCode = 400;
    error.errors = ['buildDetails deve ser um objeto quando informado.'];
    throw error;
  }

  const allowedTypes = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
  const details = allowedTypes.reduce((normalizedDetails, type) => {
    const component = value[type];

    if (!component || typeof component !== 'object' || Array.isArray(component)) {
      return normalizedDetails;
    }

    const normalizedComponent = {
      ...(normalizeOptionalText(component.id) && { id: normalizeOptionalText(component.id) }),
      ...(normalizeOptionalText(component.name) && { name: normalizeOptionalText(component.name) }),
      ...(normalizeOptionalText(component.category) && { category: normalizeOptionalText(component.category) }),
      ...(normalizeOptionalText(component.brand) && { brand: normalizeOptionalText(component.brand) }),
      ...(Number.isFinite(Number(component.price)) && { price: Number(component.price) })
    };

    return Object.keys(normalizedComponent).length > 0
      ? { ...normalizedDetails, [type]: normalizedComponent }
      : normalizedDetails;
  }, {});

  return Object.keys(details).length > 0 ? { ...details } : null;
}

function generateRecommendationFeedbackId() {
  const id = `feedback-${String(nextRecommendationFeedbackNumber).padStart(3, '0')}`;
  nextRecommendationFeedbackNumber += 1;

  return id;
}

function findRecommendationFeedbackById(feedbackId) {
  return recommendationFeedback.find((feedback) => feedback.id === feedbackId) || null;
}

function normalizeRequiredText(value, fieldName) {
  if (!isFilledText(value)) {
    const error = new Error('Dados obrigatorios ausentes para registrar avaliacao da recomendacao.');
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
