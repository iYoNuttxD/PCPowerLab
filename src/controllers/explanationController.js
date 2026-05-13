import { generateExplanation } from '../services/explanationService.js';
import { ok } from '../utils/api-response.js';

export function explainTechnicalResult(req, res, next) {
  try {
    const explanation = generateExplanation(req.body);

    return ok(res, explanation, 'Explicacao gerada com sucesso.');
  } catch (error) {
    return next(error);
  }
}