import { api } from './api.js';
import { buildQueryParams } from '../utils/queryParams.js';

export const readyBuildsService = {
  list: (filters = {}) => api.get(`/ready-builds${buildQueryParams(filters)}`),
  getById: (id) => api.get(`/ready-builds/${encodeURIComponent(id)}`)
};
