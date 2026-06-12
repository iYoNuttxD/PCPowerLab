import {
  createSavedBuildVersion,
  deleteSavedBuildVersion,
  getSavedBuildVersionById,
  listSavedBuildVersions
} from '../services/savedBuildVersionsService.js';
import { created, ok } from '../utils/api-response.js';

export function getSavedBuildVersions(req, res, next) {
  try {
    const versions = listSavedBuildVersions(req.params.id);

    return ok(res, versions, 'Versoes da configuracao encontradas com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function getSavedBuildVersion(req, res, next) {
  try {
    const version = getSavedBuildVersionById(req.params.id, req.params.versionId);

    return ok(res, version, 'Versao da configuracao encontrada com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function createSavedBuildVersionRecord(req, res, next) {
  try {
    const version = createSavedBuildVersion(req.params.id, req.body);

    return created(res, version, 'Versao da configuracao registrada com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function removeSavedBuildVersion(req, res, next) {
  try {
    const removedVersion = deleteSavedBuildVersion(req.params.id, req.params.versionId);

    return ok(res, removedVersion, 'Versao da configuracao removida com sucesso.');
  } catch (error) {
    return next(error);
  }
}