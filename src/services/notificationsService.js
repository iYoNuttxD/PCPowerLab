import { notifications } from '../data/notifications.js';

let nextNotificationNumber = 1;

export function listNotifications(filters = {}) {
  const buildId = normalizeOptionalText(filters.buildId);

  return notifications.filter((notification) => !buildId || notification.buildId === buildId);
}

export function createNotification(notificationInput) {
  validateNotificationInput(notificationInput);

  const duplicateNotification = findDuplicateNotification(notificationInput);

  if (duplicateNotification) {
    return {
      notification: duplicateNotification,
      created: false
    };
  }

  const notification = {
    id: generateNotificationId(),
    buildId: normalizeRequiredText(notificationInput.buildId, 'buildId'),
    type: normalizeRequiredText(notificationInput.type, 'type'),
    severity: normalizeSeverity(notificationInput.severity),
    message: normalizeRequiredText(notificationInput.message, 'message'),
    ...(normalizeOptionalText(notificationInput.issueCode) && {
      issueCode: normalizeOptionalText(notificationInput.issueCode)
    }),
    read: false,
    createdAt: new Date().toISOString()
  };

  notifications.push(notification);

  return {
    notification,
    created: true
  };
}

export function markNotificationAsRead(notificationId) {
  const notification = findNotificationById(notificationId);

  if (!notification) {
    throwNotificationNotFoundError();
  }

  notification.read = true;
  notification.readAt = new Date().toISOString();

  return notification;
}

export function deleteNotification(notificationId) {
  const notificationIndex = notifications.findIndex((notification) => notification.id === notificationId);

  if (notificationIndex === -1) {
    throwNotificationNotFoundError();
  }

  const [deletedNotification] = notifications.splice(notificationIndex, 1);

  return deletedNotification;
}

export function clearNotificationsForTests() {
  notifications.splice(0, notifications.length);
  nextNotificationNumber = 1;
}

function validateNotificationInput(notificationInput) {
  if (!notificationInput || typeof notificationInput !== 'object' || Array.isArray(notificationInput)) {
    const error = new Error('Informe os dados da notificação.');
    error.statusCode = 400;
    throw error;
  }

  const errors = [];

  ['buildId', 'type', 'message'].forEach((field) => {
    if (!isFilledText(notificationInput[field])) {
      errors.push(`Campo obrigatório ausente ou inválido: ${field}.`);
    }
  });

  if (
    notificationInput.severity !== undefined &&
    !['low', 'medium', 'high'].includes(normalizeOptionalText(notificationInput.severity))
  ) {
    errors.push('severity deve ser low, medium ou high quando informada.');
  }

  if (notificationInput.issueCode !== undefined && !isFilledText(notificationInput.issueCode)) {
    errors.push('issueCode deve ser um texto válido quando informado.');
  }

  if (errors.length === 0) {
    return;
  }

  const error = new Error('Notificação inválida.');
  error.statusCode = 400;
  error.errors = errors;
  throw error;
}

function findDuplicateNotification(notificationInput) {
  const buildId = normalizeRequiredText(notificationInput.buildId, 'buildId');
  const type = normalizeRequiredText(notificationInput.type, 'type');
  const issueCode = normalizeOptionalText(notificationInput.issueCode);
  const message = normalizeRequiredText(notificationInput.message, 'message');

  return notifications.find((notification) => (
    notification.buildId === buildId &&
    notification.type === type &&
    (issueCode ? notification.issueCode === issueCode : notification.message === message)
  )) || null;
}

function findNotificationById(notificationId) {
  return notifications.find((notification) => notification.id === notificationId) || null;
}

function generateNotificationId() {
  const id = `notification-${String(nextNotificationNumber).padStart(3, '0')}`;
  nextNotificationNumber += 1;

  return id;
}

function normalizeSeverity(severity) {
  return normalizeOptionalText(severity) || 'medium';
}

function throwNotificationNotFoundError() {
  const error = new Error('Notificação não encontrada.');
  error.statusCode = 404;
  throw error;
}

function normalizeRequiredText(value, fieldName) {
  if (!isFilledText(value)) {
    const error = new Error('Dados obrigatórios ausentes para notificação.');
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

  return value.trim().toLowerCase();
}

function isFilledText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
