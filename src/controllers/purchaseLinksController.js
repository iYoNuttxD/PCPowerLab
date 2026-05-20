import {
  getPurchaseLinksByBuild,
  getPurchaseLinksByComponentId
} from '../services/purchaseLinksService.js';
import { ok } from '../utils/api-response.js';

export function getComponentPurchaseLinks(req, res, next) {
  try {
    const links = getPurchaseLinksByComponentId(req.params.componentId);

    return ok(res, links, buildLinksMessage(links));
  } catch (error) {
    return next(error);
  }
}

export function getBuildPurchaseLinks(req, res, next) {
  try {
    const linksByBuild = getPurchaseLinksByBuild(req.body);

    return ok(res, linksByBuild, 'Links de compra encontrados com sucesso.');
  } catch (error) {
    return next(error);
  }
}

function buildLinksMessage(links) {
  if (links.length > 0) {
    return 'Links de compra encontrados com sucesso.';
  }

  return 'Nenhum link de compra cadastrado para este componente.';
}