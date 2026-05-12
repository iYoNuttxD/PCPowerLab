import { recommendBuildByBudget } from '../services/recommendationService.js';
import { ok } from '../utils/api-response.js';

export function recommendByBudget(req, res, next) {
  try {
    const recommendation = recommendBuildByBudget(req.body);

    return ok(res, recommendation, 'Recomendacao gerada com sucesso.');
  } catch (error) {
    return next(error);
  }
}
