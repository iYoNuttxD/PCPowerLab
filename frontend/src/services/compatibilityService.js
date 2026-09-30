import { api } from './api.js';

export const compatibilityService = {
  check: (build) => api.post('/compatibility/check', build),
  alerts: (build) => api.post('/compatibility/alerts', build),
  fixSuggestions: (build) => api.post('/compatibility/fix-suggestions', build),
  listRules: () => api.get('/compatibility-rules'),
  createRule: (payload) => api.post('/compatibility-rules', payload),
  updateRule: (id, payload) => api.put(`/compatibility-rules/${encodeURIComponent(id)}`, payload),
  deleteRule: (id) => api.delete(`/compatibility-rules/${encodeURIComponent(id)}`)
};
