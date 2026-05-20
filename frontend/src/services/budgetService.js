import { api } from './api.js';

export const budgetService = {
  validate: (payload) => api.post('/budget', payload)
};
