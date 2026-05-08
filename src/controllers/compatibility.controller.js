import {
  checkBuildCompatibilityAlerts,
  generateMissingComponentAlerts
} from '../services/compatibility-alert.service.js';
import { ok } from '../utils/api-response.js';

export function getCompatibilityAlerts(req, res, next) {
  try {
    const result = checkBuildCompatibilityAlerts(req.body.components ?? req.body);

    return ok(
      res,
      result,
      result.compatible
        ? 'Configuracao compativel. Nenhum alerta encontrado.'
        : 'Alertas de compatibilidade gerados com sucesso.'
    );
  } catch (error) {
    if (error.statusCode === 400 && error.errors?.some((message) => message.includes('ausente'))) {
      return ok(
        res,
        {
          compatible: false,
          alerts: generateMissingComponentAlerts(error),
          issues: error.errors ?? []
        },
        'Configuracao incompleta. Complete os componentes obrigatorios.'
      );
    }

    return next(error);
  }
}