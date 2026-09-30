import { api } from './api.js';
import { buildQueryParams } from '../utils/queryParams.js';

export const savedBuildsService = {
  list: () => api.get('/saved-builds'),
  get: (id) => api.get(`/saved-builds/${encodeURIComponent(id)}`),
  create: (payload) => api.post('/saved-builds', payload),
  update: (id, payload) => api.put(`/saved-builds/${encodeURIComponent(id)}`, payload),
  patch: (id, payload) => api.patch(`/saved-builds/${encodeURIComponent(id)}`, payload),
  revalidateAll: () => api.post('/saved-builds/revalidate'),
  revalidateById: (id) => api.post(`/saved-builds/${encodeURIComponent(id)}/revalidate`),
  exportJson: (id, options = {}) => (
    api.get(`/saved-builds/${encodeURIComponent(id)}/export/json${buildQueryParams(options)}`)
  ),
  remove: (id) => api.delete(`/saved-builds/${encodeURIComponent(id)}`)
};
