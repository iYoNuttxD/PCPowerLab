import { listComponents, findComponentById } from '../services/component.service.js';
import { ok, fail } from '../utils/api-response.js';

export function getComponents(req, res, next) {
  try {
    const components = listComponents({ category: req.query.category });
    return ok(res, components, 'Componentes encontrados com sucesso.');
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
