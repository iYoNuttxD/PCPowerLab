import {
  exportBuildToJson,
  exportSavedBuildToJson
} from '../services/buildExportService.js';
import { ok } from '../utils/api-response.js';

export function createBuildJsonExport(req, res, next) {
  try {
    const exportedBuild = exportBuildToJson(req.body);

    return ok(res, exportedBuild, 'Configuracao exportada em JSON com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function getSavedBuildJsonExport(req, res, next) {
  try {
    const exportedBuild = exportSavedBuildToJson(req.params.id, req.query);

    return ok(res, exportedBuild, 'Configuracao exportada em JSON com sucesso.');
  } catch (error) {
    return next(error);
  }
}
