import { api } from './api.js';

export const upgradeRoadmapService = {
  generate: (payload) => api.post('/upgrades/roadmap', payload)
};
