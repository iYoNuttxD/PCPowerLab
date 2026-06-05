import {
  createUsageProfile,
  deleteUsageProfile,
  getUsageProfileById,
  listUsageProfiles,
  updateUsageProfile
} from '../services/usageProfilesService.js';
import { created, ok } from '../utils/api-response.js';

export function getUsageProfiles(req, res, next) {
  try {
    const profiles = listUsageProfiles();

    return ok(res, profiles, buildListUsageProfilesMessage(profiles));
  } catch (error) {
    return next(error);
  }
}

export function getUsageProfile(req, res, next) {
  try {
    const profile = getUsageProfileById(req.params.id);

    return ok(res, profile, 'Perfil de uso encontrado com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function postUsageProfile(req, res, next) {
  try {
    const profile = createUsageProfile(req.body);

    return created(res, profile, 'Perfil de uso criado com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function putUsageProfile(req, res, next) {
  try {
    const profile = updateUsageProfile(req.params.id, req.body);

    return ok(res, profile, 'Perfil de uso atualizado com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function removeUsageProfile(req, res, next) {
  try {
    const profile = deleteUsageProfile(req.params.id);

    return ok(res, profile, 'Perfil de uso removido com sucesso.');
  } catch (error) {
    return next(error);
  }
}

function buildListUsageProfilesMessage(profiles) {
  if (profiles.length > 0) {
    return 'Perfis de uso encontrados com sucesso.';
  }

  return 'Nenhum perfil de uso personalizado cadastrado.';
}
