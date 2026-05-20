import { generateBuildSummary } from '../services/buildSummaryService.js';
import { ok } from '../utils/api-response.js';

export function createBuildSummary(req, res, next) {
  try {
    const summary = generateBuildSummary(req.body);

    return ok(res, summary, 'Resumo final da configuracao gerado com sucesso.');
  } catch (error) {
    return next(error);
  }
}
