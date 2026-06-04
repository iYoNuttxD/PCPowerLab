import {
  getReadyBuildById,
  listReadyBuilds
} from '../services/readyBuildsService.js';
import { ok } from '../utils/api-response.js';

export function getReadyBuilds(req, res, next) {
  try {
    const readyBuilds = listReadyBuilds(req.query);

    return ok(res, readyBuilds, buildListReadyBuildsMessage(readyBuilds, req.query.profile));
  } catch (error) {
    return next(error);
  }
}

export function getReadyBuild(req, res, next) {
  try {
    const readyBuild = getReadyBuildById(req.params.id);

    return ok(res, readyBuild, 'Configuracao pronta encontrada com sucesso.');
  } catch (error) {
    return next(error);
  }
}

function buildListReadyBuildsMessage(readyBuilds, profile) {
  if (readyBuilds.length > 0) {
    return 'Configuracoes prontas encontradas com sucesso.';
  }

  if (profile) {
    return 'Nenhuma configuracao pronta encontrada para o perfil informado.';
  }

  return 'Nenhuma configuracao pronta cadastrada.';
}