import {
  createPerformanceParameters,
  deletePerformanceParameters,
  findPerformanceParametersByComponentId,
  listPerformanceParameters,
  updatePerformanceParameters
} from '../services/performanceParametersService.js';
import { created, fail, ok } from '../utils/api-response.js';

export function getPerformanceParameters(req, res, next) {
  try {
    const parameters = listPerformanceParameters(req.query);

    return ok(res, parameters, buildListPerformanceParametersMessage(parameters));
  } catch (error) {
    return next(error);
  }
}

export function getPerformanceParametersByComponentId(req, res) {
  const parameters = findPerformanceParametersByComponentId(req.params.componentId);

  if (!parameters) {
    return fail(res, 404, 'Parametros de desempenho nao encontrados para o componente informado.');
  }

  return ok(res, parameters, 'Parametros de desempenho encontrados com sucesso.');
}

export function postPerformanceParameters(req, res, next) {
  try {
    const parameters = createPerformanceParameters(req.body);

    return created(res, parameters, 'Parametros de desempenho cadastrados com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function putPerformanceParameters(req, res, next) {
  try {
    const parameters = updatePerformanceParameters(req.params.componentId, req.body);

    return ok(res, parameters, 'Parametros de desempenho atualizados com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function deletePerformanceParametersByComponentId(req, res, next) {
  try {
    const parameters = deletePerformanceParameters(req.params.componentId);

    return ok(res, parameters, 'Parametros de desempenho removidos com sucesso.');
  } catch (error) {
    return next(error);
  }
}

function buildListPerformanceParametersMessage(parameters) {
  if (parameters.length > 0) {
    return 'Parametros de desempenho encontrados com sucesso.';
  }

  return 'Nenhum parametro de desempenho cadastrado.';
}
