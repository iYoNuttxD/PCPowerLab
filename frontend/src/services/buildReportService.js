import { api } from './api.js';

export const buildReportService = {
  generate: (payload) => api.post('/build-report', payload)
};
