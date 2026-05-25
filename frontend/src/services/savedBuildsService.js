import { api } from './api.js';

export const savedBuildsService = {
  list: () => api.get('/saved-builds'),
  get: (id) => api.get(`/saved-builds/${encodeURIComponent(id)}`),
  create: (payload) => api.post('/saved-builds', payload),
  update: (id, payload) => api.put(`/saved-builds/${encodeURIComponent(id)}`, payload),
  patch: (id, payload) => api.patch(`/saved-builds/${encodeURIComponent(id)}`, payload),
  remove: (id) => api.delete(`/saved-builds/${encodeURIComponent(id)}`)
};
