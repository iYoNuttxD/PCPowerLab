import { api } from './api.js';

export const componentsService = {
  getAll: () => api.get('/components'),
  getByType: (type) => api.get(`/components?type=${encodeURIComponent(type)}`),
  getById: (id) => api.get(`/components/${encodeURIComponent(id)}`),
  adminList: () => api.get('/admin/components'),
  adminCreate: (payload) => api.post('/admin/components', payload),
  adminUpdate: (id, payload) => api.put(`/admin/components/${encodeURIComponent(id)}`, payload),
  adminDelete: (id) => api.delete(`/admin/components/${encodeURIComponent(id)}`)
};
