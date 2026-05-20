import {
  createBuildShare,
  getSharedBuildById
} from '../services/shareBuildService.js';
import { ok } from '../utils/api-response.js';

export function shareBuild(req, res, next) {
  try {
    const sharedBuild = createBuildShare(req.body);

    return ok(res, sharedBuild, 'Link de compartilhamento gerado com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function getSharedBuild(req, res, next) {
  try {
    const sharedBuild = getSharedBuildById(req.params.shareId);

    return ok(res, sharedBuild, 'Build compartilhada encontrada com sucesso.');
  } catch (error) {
    return next(error);
  }
}