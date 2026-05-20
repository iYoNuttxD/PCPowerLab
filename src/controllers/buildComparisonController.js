import { compareBuilds } from '../services/buildComparisonService.js';
import { ok } from '../utils/api-response.js';

export function compareBuildConfigurations(req, res, next) {
  try {
    const comparison = compareBuilds(req.body);

    return ok(res, comparison, 'Comparacao de configuracoes gerada com sucesso.');
  } catch (error) {
    return next(error);
  }
}
