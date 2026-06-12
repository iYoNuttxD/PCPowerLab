import { Router } from 'express';
import {
  getNotifications,
  patchNotificationRead,
  removeNotification
} from '../controllers/notificationsController.js';

export const notificationsRoutes = Router();

notificationsRoutes.get('/', getNotifications);
notificationsRoutes.patch('/:id/read', patchNotificationRead);
notificationsRoutes.delete('/:id', removeNotification);
