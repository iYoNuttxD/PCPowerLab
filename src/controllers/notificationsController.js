import {
  deleteNotification,
  listNotifications,
  markNotificationAsRead
} from '../services/notificationsService.js';
import { ok } from '../utils/api-response.js';

export function getNotifications(req, res, next) {
  try {
    const notifications = listNotifications(req.query);

    return ok(res, notifications, buildListNotificationsMessage(notifications));
  } catch (error) {
    return next(error);
  }
}

export function patchNotificationRead(req, res, next) {
  try {
    const notification = markNotificationAsRead(req.params.id);

    return ok(res, notification, 'Notificação marcada como lida com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function removeNotification(req, res, next) {
  try {
    const notification = deleteNotification(req.params.id);

    return ok(res, notification, 'Notificação removida com sucesso.');
  } catch (error) {
    return next(error);
  }
}

function buildListNotificationsMessage(notifications) {
  if (notifications.length > 0) {
    return 'Notificações encontradas com sucesso.';
  }

  return 'Nenhuma notificação cadastrada para os filtros informados.';
}
