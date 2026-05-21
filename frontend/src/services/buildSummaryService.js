import { api } from './api.js';

export const buildSummaryService = {
  generate: (payload) => api.post('/build-summary', payload)
};
