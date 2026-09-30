import { api } from './api.js';
import { buildQueryParams } from '../utils/queryParams.js';

export const costBenefitService = {
  listComponents: (filters = {}) => api.get(`/components/cost-benefit${buildQueryParams(filters)}`)
};
