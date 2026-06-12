import { api } from './api.js';
import { buildQueryParams } from '../utils/queryParams.js';

export const recommendationFeedbackService = {
  list: (filters = {}) => api.get(`/recommendation-feedback${buildQueryParams(filters)}`),
  getById: (id) => api.get(`/recommendation-feedback/${encodeURIComponent(id)}`),
  create: (payload) => api.post('/recommendation-feedback', payload),
  remove: (id) => api.delete(`/recommendation-feedback/${encodeURIComponent(id)}`)
};
