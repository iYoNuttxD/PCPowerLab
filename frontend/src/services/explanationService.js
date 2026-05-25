import { api } from './api.js';

export const explanationService = {
  explain: (payload) => api.post('/explanations', payload)
};
