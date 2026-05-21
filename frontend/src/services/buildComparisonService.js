import { api } from './api.js';

export const buildComparisonService = {
  compare: (payload) => api.post('/build-comparison', payload)
};
