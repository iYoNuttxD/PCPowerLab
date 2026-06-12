import {
  deleteSavedBuild,
  getSavedBuildById,
  listSavedBuilds,
  saveBuild,
  updateSavedBuild
} from '../services/savedBuildsService.js';
import { exportSavedBuildToJson } from '../services/buildExportService.js';
import { createSavedBuildVersion } from '../services/savedBuildVersionsService.js';
import { created, ok } from '../utils/api-response.js';

export function getSavedBuilds(_req, res, next) {
  try {
    return ok(res, listSavedBuilds(), 'Configurações salvas encontradas com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function getSavedBuild(req, res, next) {
  try {
    const savedBuild = getSavedBuildById(req.params.id);

    return ok(res, savedBuild, 'Configuração salva encontrada com sucesso.');
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

export function createSavedBuild(req, res, next) {
  try {
    const savedBuild = saveBuild(req.body);
    createSavedBuildVersion(savedBuild.id, {
      reason: 'Versao inicial da configuracao salva.',
      buildSnapshot: savedBuild
    });

    return created(res, savedBuild, 'Configuração salva com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function editSavedBuild(req, res, next) {
  try {
    const updatedSavedBuild = updateSavedBuild(req.params.id, req.body);
    createSavedBuildVersion(updatedSavedBuild.id, {
      reason: 'Atualizacao da configuracao salva.',
      buildSnapshot: updatedSavedBuild
    });

    return ok(res, updatedSavedBuild, 'Configuração atualizada com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function removeSavedBuild(req, res, next) {
  try {
    const removedSavedBuild = deleteSavedBuild(req.params.id);

    return ok(res, removedSavedBuild, 'Configuração salva removida com sucesso.');
  } catch (error) {
    return next(error);
  }
}