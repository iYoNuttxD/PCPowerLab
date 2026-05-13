import { createBudget } from '../services/budgetService.js';
import { ok } from '../utils/api-response.js';

export function registerBudget(req, res, next) {
  try {
    const budget = createBudget(req.body);

    return ok(res, budget, 'Orcamento informado com sucesso.');
  } catch (error) {
    return next(error);
  }
}