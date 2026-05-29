import { calculateBuildScore } from '../services/buildScoreService.js';
import { ok } from '../utils/api-response.js';

export function createBuildScore(req, res, next) {
  try {
    const score = calculateBuildScore(req.body);

    return ok(res, score, 'Nota geral da configuração calculada com sucesso.');
  } catch (error) {
    return next(error);
  }
}
