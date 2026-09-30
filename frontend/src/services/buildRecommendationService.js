import { api } from './api.js';

export const buildRecommendationService = {
  byBudgetRange: (payload) => api.post('/recommendations/builds-by-budget-range', payload)
};
