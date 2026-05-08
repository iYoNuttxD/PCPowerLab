import { generateCompatibilityAlerts } from '../services/compatibility-alert.service.js';
import { checkBuildCompatibility } from '../services/compatibility.service.js';
import { selectBuildComponents } from '../services/build.service.js';
import { ok } from '../utils/api-response.js';

export function selectComponents(req, res, next) {
  try {
    const build = selectBuildComponents(req.body);

    return ok(res, build, 'Configuracao selecionada com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function checkCompatibility(req, res, next) {
  try {
    const result = checkBuildCompatibility(req.body.components);
    const alerts = generateCompatibilityAlerts(result);

    return ok(
      res,
      {
        ...result,
        issues: result.alerts,
        alerts
      },
      result.compatible
        ? 'Configuracao compativel.'
        : 'Configuracao possui alertas de compatibilidade.'
    );
  } catch (error) {
    return next(error);
  }
}