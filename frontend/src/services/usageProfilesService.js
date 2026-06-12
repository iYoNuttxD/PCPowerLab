import { api } from './api.js';

export const usageProfilesService = {
  list: () => api.get('/usage-profiles'),
  getById: (id) => api.get(`/usage-profiles/${encodeURIComponent(id)}`),
  create: (payload) => api.post('/usage-profiles', payload),
  update: (id, payload) => api.put(`/usage-profiles/${encodeURIComponent(id)}`, payload),
  remove: (id) => api.delete(`/usage-profiles/${encodeURIComponent(id)}`)
};
