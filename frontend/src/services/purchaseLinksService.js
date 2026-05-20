import { api } from './api.js';

export const purchaseLinksService = {
  byComponent: (componentId) => api.get(`/purchase-links/${encodeURIComponent(componentId)}`),
  byBuild: (payload) => api.post('/purchase-links/by-build', payload)
};
