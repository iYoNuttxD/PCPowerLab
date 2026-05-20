import { suggestUpgrades } from '../services/upgradeSuggestionService.js';
import { ok } from '../utils/api-response.js';

export function suggestBuildUpgrades(req, res, next) {
  try {
    const suggestions = suggestUpgrades(req.body);

    return ok(res, suggestions, 'Sugestoes de upgrade geradas com sucesso.');
  } catch (error) {
    return next(error);
  }
}
