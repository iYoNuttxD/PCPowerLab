import {
  createAdminComponent,
  deactivateAdminComponent,
  findAdminComponentById,
  listAdminComponents,
  updateAdminComponent
} from '../services/admin-component.service.js';
import { created, fail, ok } from '../utils/api-response.js';

export function getAdminComponents(req, res, next) {
  try {
    const components = listAdminComponents(req.query);

    return ok(res, components, buildListAdminComponentsMessage(components));
  } catch (error) {
    return next(error);
  }
}

export function getAdminComponentById(req, res) {
  const component = findAdminComponentById(req.params.id);

  if (!component) {
    return fail(res, 404, 'Componente nao encontrado.');
  }

  return ok(res, component, 'Componente encontrado com sucesso.');
}

export function postAdminComponent(req, res, next) {
  try {
    const component = createAdminComponent(req.body);

    return created(res, component, 'Componente cadastrado com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function putAdminComponent(req, res, next) {
  try {
    const component = updateAdminComponent(req.params.id, req.body);

    return ok(res, component, 'Componente atualizado com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function deleteAdminComponent(req, res, next) {
  try {
    const component = deactivateAdminComponent(req.params.id);

    return ok(res, component, 'Componente desativado com sucesso.');
  } catch (error) {
    return next(error);
  }
}

function buildListAdminComponentsMessage(components) {
  if (components.length > 0) {
    return 'Componentes administrativos encontrados com sucesso.';
  }

  return 'Nenhum componente cadastrado.';
}
