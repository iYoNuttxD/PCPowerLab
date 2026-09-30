import { api } from './api.js';

export const gameComparisonService = {
  compare: (payload) => api.post('/performance/compare-games', payload)
};
