import {
  createCompatibilityRule,
  deleteCompatibilityRule,
  listCompatibilityRules,
  updateCompatibilityRule
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

export function putCompatibilityRule(req, res, next) {
  try {
    const rule = updateCompatibilityRule(req.params.id, req.body);

    return ok(res, rule, 'Regra de compatibilidade atualizada com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function removeCompatibilityRule(req, res, next) {
  try {
    const rule = deleteCompatibilityRule(req.params.id);

    return ok(res, rule, 'Regra de compatibilidade removida com sucesso.');
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
