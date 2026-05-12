import { analyzeBuildBottlenecks } from '../services/bottleneck.service.js';
import { ok } from '../utils/api-response.js';

export function analyzeBottlenecks(req, res, next) {
  try {
    const result = analyzeBuildBottlenecks(req.body);

    return ok(res, result, 'Analise de gargalos concluida.');
  } catch (error) {
    return next(error);
  }
}
