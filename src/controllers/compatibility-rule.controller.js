import {
  createCompatibilityRule,
  listCompatibilityRules
} from '../services/compatibility-rule.service.js';
import { created, ok } from '../utils/api-response.js';

export function getCompatibilityRules(req, res, next) {
  try {
    const rules = listCompatibilityRules(req.query);

    return ok(res, rules, buildListCompatibilityRulesMessage(rules));
  } catch (error) {
    return next(error);
  }
}

export function postCompatibilityRule(req, res, next) {
  try {
    const rule = createCompatibilityRule(req.body);

    return created(res, rule, 'Regra de compatibilidade cadastrada com sucesso.');
  } catch (error) {
    return next(error);
  }
}

function buildListCompatibilityRulesMessage(rules) {
  if (rules.length > 0) {
    return 'Regras de compatibilidade encontradas com sucesso.';
  }

  return 'Nenhuma regra de compatibilidade cadastrada para os filtros informados.';
}
