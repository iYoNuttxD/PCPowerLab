import { api } from './api.js';

export const upgradeService = {
  suggest: (payload) => api.post('/upgrades/suggest', payload),
  roadmap: (payload) => api.post('/upgrades/roadmap', payload)
};
