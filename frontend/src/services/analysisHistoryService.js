import { api } from './api.js';
import { buildQueryParams } from '../utils/queryParams.js';

export const analysisHistoryService = {
  list: (filters = {}) => api.get(`/analysis-history${buildQueryParams(filters)}`),
  getById: (id) => api.get(`/analysis-history/${encodeURIComponent(id)}`),
  create: (payload) => api.post('/analysis-history', payload),
  remove: (id) => api.delete(`/analysis-history/${encodeURIComponent(id)}`)
};
