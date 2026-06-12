import { api } from './api.js';
import { buildQueryParams } from '../utils/queryParams.js';

export const notificationsService = {
  list: (filters = {}) => api.get(`/notifications${buildQueryParams(filters)}`),
  markAsRead: (id) => api.patch(`/notifications/${encodeURIComponent(id)}/read`),
  remove: (id) => api.delete(`/notifications/${encodeURIComponent(id)}`)
};
