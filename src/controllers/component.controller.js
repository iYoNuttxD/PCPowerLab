import { listComponents, findComponentById } from '../services/component.service.js';
import { ok, fail } from '../utils/api-response.js';

export function getComponents(req, res, next) {
  try {
    const requestedType = req.query.type ?? req.query.category;
    const components = listComponents({ type: requestedType });
    const message = buildListComponentsMessage(components, requestedType);

    return ok(res, components, message);
  } catch (error) {
    return next(error);
  }
}

export function getComponentById(req, res) {
  const component = findComponentById(req.params.id);

  if (!component) {
    return fail(res, 404, 'Componente não encontrado.');
  }

  return ok(res, component, 'Componente encontrado com sucesso.');
}

function buildListComponentsMessage(components, requestedType) {
  if (components.length > 0) {
    return 'Componentes encontrados com sucesso.';
  }

  if (requestedType) {
    return 'Nenhum componente cadastrado para a categoria informada.';
  }

  return 'Nenhum componente cadastrado.';
}
