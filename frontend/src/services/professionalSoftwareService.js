import { api } from './api.js';
import { buildQueryParams } from '../utils/queryParams.js';

export const professionalSoftwareService = {
  list: (filters = {}) => api.get(`/professional-software${buildQueryParams(filters)}`),
  getById: (id) => api.get(`/professional-software/${encodeURIComponent(id)}`),
  simulate: (payload) => api.post('/performance/simulate-software', payload)
};
