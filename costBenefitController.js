import { listComponentsByCostBenefit } from '../services/costBenefitService.js';
import { ok } from '../utils/api-response.js';

export function getComponentsCostBenefit(req, res, next) {
  try {
    const ranking = listComponentsByCostBenefit({
      category: req.query.category ?? req.query.type,
      limit: req.query.limit
    });

    return ok(res, ranking, 'Classificação de custo-benefício gerada com sucesso.');
  } catch (error) {
    return next(error);
  }
}
