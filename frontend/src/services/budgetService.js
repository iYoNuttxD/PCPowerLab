import { api } from './api.js';
import { normalizeBudgetPayload } from '../utils/buildHelpers.js';

export const budgetService = {
  validate: (payload) => api.post('/budget', normalizeBudgetPayload(payload))
};
