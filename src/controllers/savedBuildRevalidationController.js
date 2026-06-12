import {
  revalidateAllSavedBuilds,
  revalidateSavedBuild
} from '../services/savedBuildRevalidationService.js';
import { ok } from '../utils/api-response.js';

export function revalidateSavedBuilds(req, res, next) {
  try {
    const result = revalidateAllSavedBuilds();

    return ok(res, result, 'Revalidação de configurações salvas concluída.');
  } catch (error) {
    return next(error);
  }
}

export function revalidateSingleSavedBuild(req, res, next) {
  try {
    const result = revalidateSavedBuild(req.params.id);

    return ok(res, result, 'Revalidação da configuração salva concluída.');
  } catch (error) {
    return next(error);
  }
}
