import { api } from './api.js';

export const sharingService = {
  create: (payload) => api.post('/share/build', payload),
  get: (shareId) => api.get(`/share/build/${encodeURIComponent(shareId)}`)
};
