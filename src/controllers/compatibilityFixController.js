import { suggestCompatibilityFixes } from '../services/compatibilityFixService.js';
import { ok } from '../utils/api-response.js';

export function getCompatibilityFixSuggestions(req, res, next) {
  try {
    const result = suggestCompatibilityFixes(req.body.components ?? req.body);

    return ok(
      res,
      result,
      'Alternativas para correcao de incompatibilidade geradas com sucesso.'
    );
  } catch (error) {
    return next(error);
  }
}
