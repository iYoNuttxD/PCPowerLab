import { api } from './api.js';

export const recommendationService = {
  byBudget: (payload) => api.post('/recommendations/budget', payload),
  byUsage: (payload) => api.post('/recommendations/by-usage', payload),
  buildsByBudgetRange: (payload) => api.post('/recommendations/builds-by-budget-range', payload),
  explain: (payload) => api.post('/explanations', payload),
  summary: (payload) => api.post('/build-summary', payload),
  compare: (payload) => api.post('/build-comparison', payload),
  suggestUpgrades: (payload) => api.post('/upgrades/suggest', payload)
};
