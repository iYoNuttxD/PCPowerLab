import { api } from './api.js';

export const buildScoreService = {
  calculate: (payload) => api.post('/build-score', payload)
};
